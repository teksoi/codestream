import React from "react";
import ReactDOM from "react-dom";
import AsyncSelect from "react-select/async";
import Icon from "../Icon";
import Menu from "../Menu";
import {
	ThirdPartyProviderConfig,
	FetchThirdPartyBoardsRequestType,
	TrelloList,
	TrelloBoard,
	FetchAssignableUsersRequestType,
	FetchThirdPartyCardsRequestType,
	TrelloCard
} from "@codestream/protocols/agent";
import { useSelector, useDispatch } from "react-redux";
import { CodeStreamState } from "@codestream/webview/store";
import { getIntegrationData } from "@codestream/webview/store/activeIntegrations/reducer";
import { updateForProvider } from "@codestream/webview/store/activeIntegrations/actions";
import { emptyArray, mapFilter } from "@codestream/webview/utils";
import { HostApi } from "@codestream/webview/webview-api";
import { TrelloIntegrationData } from "@codestream/webview/store/activeIntegrations/types";
import { setIssueProvider } from "@codestream/webview/store/context/actions";
import { CrossPostIssueContext } from "../CodemarkForm";
import { useDidMount } from "@codestream/webview/utilities/hooks";
import { disconnectProvider } from "@codestream/webview/store/providers/actions";

interface Props {
	provider: ThirdPartyProviderConfig;
}

export function TrelloCardControls(props: React.PropsWithChildren<Props>) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<TrelloIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<TrelloIntegrationData>) => {
			dispatch(updateForProvider<TrelloIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	useDidMount(() => {
		if (data.boards && data.boards.length > 0) {
			crossPostIssueContext.setValues({
				listId: data.currentList ? data.currentList.id : data.boards[0].lists[0].id
			});
			return;
		}

		if (!data.isLoading) {
			updateDataState({
				isLoading: true
			});
		}

		let isValid = true;

		const fetchBoards = async () => {
			const response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
				providerId: props.provider.id
			});

			if (!isValid) return;
			// make sure to persist current board/list selection if possible
			const newCurrentBoard = (data.currentBoard
				? response.boards.find(b => b.id === data.currentBoard!.id)
				: response.boards[0]) as TrelloBoard;

			const newCurrentList = (data.currentList
				? newCurrentBoard.lists.find(l => l.id === data.currentList!.id)
				: newCurrentBoard.lists[0]) as TrelloList;

			updateDataState({
				isLoading: false,
				boards: response.boards as TrelloBoard[],
				currentBoard: newCurrentBoard,
				currentList: newCurrentList
			});

			crossPostIssueContext.setValues({
				listId: newCurrentList.id
			});
		};

		fetchBoards();

		return () => {
			isValid = false;
		};
	});

	const [boardMenuState, setBoardMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });
	const [listMenuState, setListMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });

	const handleClickBoard = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setBoardMenuState(state => ({
			open: !state.open,
			target
		}));
	}, []);

	const selectBoard = React.useCallback((board?: TrelloBoard) => {
		setBoardMenuState({ open: false });
		if (board) {
			updateDataState({
				currentBoard: board,
				currentList: board.lists[0]
			});
			crossPostIssueContext.setValues({
				listId: board.lists[0].id
			});
		}
	}, []);

	const handleClickList = React.useCallback((event: React.MouseEvent) => {
		event.stopPropagation();
		const target = event.target;
		setListMenuState(state => ({
			open: !state.open,
			target
		}));
	}, []);

	const selectList = React.useCallback((list?: TrelloList) => {
		setListMenuState({ open: false });

		if (list) {
			crossPostIssueContext.setValues({
				listId: list.id
			});
			updateDataState({
				currentList: list
			});
		}
	}, []);

	const loadAssignableUsers = React.useCallback(
		async (inputValue: string) => {
			if (!data.currentBoard) return [];

			const { users } = await HostApi.instance.send(FetchAssignableUsersRequestType, {
				providerId: props.provider.id,
				boardId: data.currentBoard!.id
			});
			return mapFilter(users, u => {
				if (u.displayName.toLowerCase().includes(inputValue.toLowerCase()))
					return { label: u.displayName, value: u };
				else return;
			});
		},
		[data.currentBoard]
	);

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const assigneesInput = (() => {
		if (crossPostIssueContext.assigneesInputTarget == undefined) return null;

		const { currentBoard } = data;

		return ReactDOM.createPortal(
			<AsyncSelect
				key={currentBoard ? currentBoard.id : "no-board"}
				id="input-assignees"
				name="assignees"
				classNamePrefix="react-select"
				defaultOptions
				loadOptions={loadAssignableUsers}
				value={crossPostIssueContext.selectedAssignees}
				isMulti
				placeholder="Members (optional)"
				getOptionValue={option => option.value.id}
				onChange={value => crossPostIssueContext.setSelectedAssignees(value)}
			/>,
			crossPostIssueContext.assigneesInputTarget
		);
	})();

	if (data.isLoading)
		return (
			<>
				{assigneesInput}
				<span>
					<Icon className="spin" name="sync" /> Fetching boards...
				</span>
				<a
					style={{ marginLeft: "5px" }}
					onClick={e => {
						e.preventDefault();
						dispatch(setIssueProvider(undefined));
						updateDataState({ isLoading: false });
					}}
				>
					cancel
				</a>
			</>
		);

	const boardItems = (data.boards || emptyArray).map(board => ({
		label: board.name,
		key: board.id,
		action: board
	}));
	const listItems = data.currentBoard
		? data.currentBoard.lists.map(list => ({
				label: list.name,
				key: list.id,
				action: list
		  }))
		: [];

	return (
		<>
			{assigneesInput}
			<div className="checkbox-row">
				<input type="checkbox" checked onChange={e => dispatch(setIssueProvider(undefined))} />
				{" Add a card on "}
				<span className="channel-label" onClick={handleClickBoard}>
					{data.currentBoard && data.currentBoard.name}
					<Icon name="chevron-down" />
					{boardMenuState.open && (
						<Menu
							align="center"
							compact={true}
							target={boardMenuState.target}
							items={boardItems}
							action={selectBoard}
						/>
					)}
				</span>
				{listItems.length > 0 && (
					<>
						{" in "}
						<span className="channel-label" onClick={handleClickList}>
							{data.currentList ? data.currentList.name : ""}
							<Icon name="chevron-down" />
							{listMenuState.open && (
								<Menu
									align="center"
									compact={true}
									target={listMenuState.target}
									items={listItems}
									action={selectList}
								/>
							)}
						</span>{" "}
					</>
				)}
				{` on `}
				{props.children}
			</div>
		</>
	);
}

export function TrelloCardDropdown(props: React.PropsWithChildren<Props>) {
	const dispatch = useDispatch();
	const data = useSelector((state: CodeStreamState) =>
		getIntegrationData<TrelloIntegrationData>(state.activeIntegrations, props.provider.id)
	);
	const updateDataState = React.useCallback(
		(data: Partial<TrelloIntegrationData>) => {
			dispatch(updateForProvider<TrelloIntegrationData>(props.provider.id, data));
		},
		[props.provider.id]
	);

	const buttonRef = React.useRef<HTMLElement>(null);

	useDidMount(() => {
		if (data.boards && data.boards.length > 0) {
			crossPostIssueContext.setValues({
				listId: data.currentList ? data.currentList.id : data.boards[0].lists[0].id
			});
			return;
		}

		if (!data.isLoading) {
			updateDataState({
				isLoading: true
			});
		}

		let isValid = true;

		const fetchBoards = async () => {
			const response = await HostApi.instance.send(FetchThirdPartyBoardsRequestType, {
				providerId: props.provider.id
			});

			if (!isValid) return;
			// make sure to persist current board/list selection if possible
			const newCurrentBoard = data.currentBoard
				? (response.boards.find(b => b.id === data.currentBoard!.id) as TrelloBoard)
				: undefined;

			const newCurrentList =
				newCurrentBoard && data.currentList
					? (newCurrentBoard.lists.find(l => l.id === data.currentList!.id) as TrelloList)
					: undefined;

			updateDataState({
				isLoading: false,
				boards: response.boards as TrelloBoard[],
				currentBoard: newCurrentBoard,
				currentList: newCurrentList
			});

			// crossPostIssueContext.setValues({
			// listId: newCurrentList.id
			// });
		};

		fetchBoards();

		return () => {
			isValid = false;
		};
	});

	React.useEffect(() => {
		void (async () => {
			if (!data.currentList) return;

			try {
				updateDataState({ isLoading: true });
				const response = await HostApi.instance.send(FetchThirdPartyCardsRequestType, {
					providerId: props.provider.id,
					listId: data.currentList.id
				});

				updateDataState({
					isLoading: false,
					cards: response.cards as TrelloCard[]
				});
			} catch (error) {
			} finally {
				updateDataState({ isLoading: false });
			}
		})();
	}, [data.currentList]);

	// reload "cards assigned to me"
	React.useEffect(() => {
		void (async () => {
			if (data.mode !== "mine") return;

			try {
				updateDataState({ isLoading: true });
				const response = await HostApi.instance.send(FetchThirdPartyCardsRequestType, {
					providerId: props.provider.id,
					assignedToMe: true
				});

				updateDataState({
					isLoading: false,
					cards: response.cards as TrelloCard[]
				});
			} catch (error) {
			} finally {
				updateDataState({ isLoading: false });
			}
		})();
	}, [data.mode]);

	const [menuState, setMenuState] = React.useState<{
		open: boolean;
		target?: EventTarget;
	}>({ open: false, target: undefined });

	const handleClickDropdown = React.useCallback((event: React.MouseEvent) => {
		if (data.isLoading) {
			event.preventDefault();
			dispatch(setIssueProvider(undefined));
			updateDataState({ isLoading: false });
		} else {
			event.stopPropagation();
			// @ts-ignore
			const target = event.target.closest(".dropdown-button");
			setMenuState(state => ({ open: !state.open }));
		}
	}, []);

	const goDisconnect = () => {};

	const selectBoard = React.useCallback((board?: TrelloBoard) => {
		if (board) {
			setMenuState({ open: true });
			updateDataState({ currentBoard: board, currentList: undefined });
		} else {
			setMenuState({ open: false });
		}
	}, []);

	const goBoards = () => updateDataState({ currentBoard: undefined, currentList: undefined });

	const selectList = React.useCallback((list?: TrelloList) => {
		if (list) {
			setMenuState({ open: true });
			updateDataState({ currentList: list });
		} else {
			setMenuState({ open: false });
		}
	}, []);

	const goLists = () => updateDataState({ currentList: undefined });

	const selectCard = React.useCallback((card?: TrelloCard) => {
		if (card) crossPostIssueContext.setValues({ card });
		setMenuState({ open: false });
	}, []);

	const goBrowse = () => updateDataState({ mode: "browse" });
	const goMine = () => updateDataState({ mode: "mine" });
	const goSettings = () => updateDataState({ mode: "settings" });
	const noop = () => setMenuState({ open: false });

	const crossPostIssueContext = React.useContext(CrossPostIssueContext);

	const settingsItems = [
		{ label: "-" },
		{ label: "Cards Assigned to Me", key: "mine", action: goMine },
		{ label: "Browse by Board & List", key: "browse", action: goBrowse },
		{ label: "-" },
		{ label: "Disconnect Trello", key: "disconnect", action: goDisconnect, icon: <Icon name="x" /> }
	];

	const boardItems = (data.boards || emptyArray).map(board => ({
		label: board.name,
		key: board.id,
		action: board
	}));
	// @ts-ignore
	boardItems.unshift({ label: "-" });
	// @ts-ignore
	boardItems.unshift({ label: "My Cards (across all boards)", key: "mine", action: goMine });
	// @ts-ignore
	boardItems.unshift({ label: "-" });

	const listItems = data.currentBoard
		? data.currentBoard.lists.map(list => ({
				label: list.name,
				key: list.id,
				action: list
		  }))
		: [];
	// @ts-ignore
	listItems.unshift({ label: "-" });
	// @ts-ignore
	listItems.unshift({ label: "My Cards (on this board)", key: "mine", action: goMine });
	// @ts-ignore
	listItems.unshift({ label: "-" });
	const cardItems = data.cards
		? data.cards.map(card => ({
				label: card.name,
				searchLabel: card.name,
				key: card.id,
				action: card
		  }))
		: [];
	// @ts-ignore
	cardItems.unshift({ label: "-" });
	// @ts-ignore
	cardItems.unshift({ label: "My Cards (on this list)", key: "mine", action: goMine });
	// @ts-ignore
	cardItems.unshift({ type: "search" }, { label: "-" });

	return (
		<>
			<span
				className={`dropdown-button ${menuState.open ? "selected" : ""}`}
				onClick={handleClickDropdown}
				ref={buttonRef}
			>
				{data.isLoading ? <Icon className="spin" name="sync" /> : <Icon name="chevron-down" />}
			</span>
			{menuState.open &&
				(data.mode === "settings" ? (
					<Menu
						title="Settings"
						noCloseIcon={true}
						align="dropdownRight"
						target={buttonRef.current}
						items={settingsItems}
						dontCloseOnSelect={true}
						action={noop}
						limitWidth={true}
					/>
				) : data.mode === "mine" ? (
					cardItems.length > 2 && (
						<Menu
							title="All cards assigned to me"
							noCloseIcon={true}
							titleIcon={<Icon name="gear" onClick={goSettings} />}
							align="dropdownRight"
							target={buttonRef.current}
							items={cardItems}
							dontCloseOnSelect={true}
							action={selectBoard}
							limitWidth={true}
						/>
					)
				) : !data.currentBoard ? (
					<Menu
						title="Select a Trello Board"
						noCloseIcon={true}
						titleIcon={<Icon name="gear" onClick={goSettings} />}
						align="dropdownRight"
						target={buttonRef.current}
						items={boardItems}
						dontCloseOnSelect={true}
						action={selectBoard}
						limitWidth={true}
					/>
				) : !data.currentList ? (
					<Menu
						title={data.currentBoard && data.currentBoard.name}
						centerTitle={true}
						noCloseIcon={true}
						backIcon={<Icon name="chevron-left" onClick={goBoards} />}
						titleIcon={<Icon name="gear" onClick={goSettings} />}
						align="dropdownRight"
						target={buttonRef.current}
						items={listItems}
						dontCloseOnSelect={true}
						action={selectList}
						limitWidth={true}
					/>
				) : (
					<Menu
						title={data.currentList && data.currentList.name}
						centerTitle={true}
						noCloseIcon={true}
						backIcon={<Icon name="chevron-left" onClick={goLists} />}
						titleIcon={<Icon name="gear" onClick={goSettings} />}
						align="dropdownRight"
						target={buttonRef.current}
						items={data.isLoading ? [] : cardItems}
						dontCloseOnSelect={true}
						action={selectCard}
						limitWidth={true}
					/>
				))}
		</>
	);
}
