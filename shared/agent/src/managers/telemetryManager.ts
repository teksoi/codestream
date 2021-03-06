import { Logger } from "../logger";
import { TelemetryRequest, TelemetryRequestType } from "../protocol/agent.protocol";
import { CodeStreamSession } from "../session";
import { debug, lsp, lspHandler } from "../system";
import { TelemetryService } from "../telemetry/telemetry";

@lsp
export class TelemetryManager {
	private readonly _telemetry: TelemetryService;

	constructor(session: CodeStreamSession) {
		// TODO: Respect VSCode telemetry opt out
		this._telemetry = new TelemetryService(session, false);
	}

	setConsent(hasConsented: boolean) {
		this._telemetry.setConsent(hasConsented);
	}

	alias(id: string): any {
		this._telemetry.alias(id);
	}

	identify(id: string, props: { [key: string]: any }) {
		this._telemetry.identify(id, props);
	}

	setSuperProps(props: { [key: string]: string | number | boolean }) {
		this._telemetry.setSuperProps(props);
	}

	setFirstSessionProps(firstSessionStartedAt: number, firstSessionTimesOutAfter: number) {
		this._telemetry.setFirstSessionProps(firstSessionStartedAt, firstSessionTimesOutAfter);
	}

	ready(): Promise<void> {
		return this._telemetry.ready();
	}

	@debug()
	@lspHandler(TelemetryRequestType)
	track(request: TelemetryRequest) {
		const cc = Logger.getCorrelationContext();
		try {
			if (request.options && request.options.alias) {
				this.alias(request.options.alias);
			}
			void this._telemetry.track(request.eventName, request.properties);
		} catch (ex) {
			Logger.error(ex, cc);
		}
	}
}
