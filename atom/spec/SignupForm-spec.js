import React from "react";
import Enzyme, { render } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { mountWithIntl } from "./intl-test-helper.js";
import { SimpleSignupForm as SignupForm } from "../lib/components/SignupForm";

Enzyme.configure({ adapter: new Adapter() });

const mockRepository = { getConfigValue() {}, getWorkingDirectory() {} };

describe("SignupForm view", () => {
	describe("Username field", () => {
		const systemUser = "tommy";
		const view = mountWithIntl(<SignupForm username={systemUser} />);

		describe("when a username is provided", () => {
			it("is pre-populated with given username", () => {
				expect(view.find('input[name="username"]').prop("value")).toBe(systemUser);
			});
		});

		describe("when a username is not provided", () => {
			it("uses 'Username' as the placeholder", () => {
				expect(view.find('input[name="username"]').prop("placeholder")).toBe("Username");
			});
		});

		it("shows errors when left empty", () => {
			view.find('input[name="username"]').simulate("blur");
			expect(view.find('input[name="username"][required]').exists()).toBe(true);
		});

		it("shows errors when there are invalid characters", () => {
			const event = { target: { value: "foobar\\?^$" } };
			view.find('input[name="username"]').simulate("change", event);
			expect(view.find("#username-controls .error-message").text()).toContain("characters");
		});

		describe("when a username is already in use on a team", () => {
			it("shows errors on blur", () => {
				const team = {
					usernames: ["foobar"]
				};
				const view = mountWithIntl(<SignupForm username={systemUser} team={team} />);
				const event = { target: { value: "foobar" } };
				view.find('input[name="username"]').simulate("change", event);
				view.find('input[name="username"]').simulate("blur");
				expect(view.find("#username-controls .error-message").text()).toBe(
					"Sorry, someone already grabbed that username."
				);
			});
		});
	});

	describe("Password field", () => {
		const view = mountWithIntl(<SignupForm />);

		it("shows errors when left empty", () => {
			view.find('input[name="password"]').simulate("blur");
			expect(view.find('input[name="password"][required]').exists()).toBe(true);
		});

		it("shows message when value is not long enough", () => {
			view.find('input[name="password"]').simulate("blur");
			view.find('input[name="password"]').simulate("change", { target: { value: "four" } });
			expect(view.find("#password-controls .error-message").text()).toBe(
				"2 more characters please"
			);
		});
	});

	describe("Email address field", () => {
		const view = mountWithIntl(<SignupForm />);

		it("shows errors when left empty", () => {
			view.find('input[name="email"]').simulate("blur");
			expect(view.find('input[name="email"][required]').exists()).toBe(true);
		});

		it("shows errors when provided input is invalid", () => {
			view.find('input[name="email"]').simulate("change", { target: { value: "foo@" } });
			expect(view.find("#email-controls .error-message").text()).toBe(
				"Looks like an invalid email address!"
			);
		});

		describe("when an email address is not provided", () => {
			it("uses 'Email Address' as the placeholder", () => {
				expect(view.find('input[name="email"]').prop("placeholder")).toBe("Email Address");
			});
		});

		describe("when an email address is provided to the component", () => {
			const email = "foo@bar.com";
			const view = mountWithIntl(<SignupForm email={email} />);
			it("is pre-populated with given email address", () => {
				expect(view.find('input[name="email"]').prop("value")).toBe(email);
			});
		});
	});

	describe("Sign Up button", () => {
		const view = mountWithIntl(<SignupForm />);

		it("is disabled while the form values are invalid", () => {
			expect(view.find("Button").prop("disabled")).toBe(true);
		});

		it("is clickable while the form values are valid", () => {
			view.find('input[name="username"]').simulate("change", { target: { value: "f_oo-b7a.r" } });
			view.find('input[name="password"]').simulate("change", { target: { value: "somePassword" } });
			view.find('input[name="email"]').simulate("change", { target: { value: "foo@bar.com" } });

			expect(view.find("Button").prop("disabled")).toBe(false);
		});
	});

	describe("when valid credentials are submitted", () => {
		const email = "foo@bar.com";
		const username = "foobar";
		const password = "somePassword";
		const register = jasmine.createSpy("stub for register api").andReturn(Promise.resolve());
		const transition = jasmine.createSpy("transition function");

		describe("when the name provided is a simple two part name", () => {
			it("sends first and last name", () => {
				const firstName = "Foo";
				const lastName = "Bar";
				const name = `${firstName} ${lastName}`;
				const view = mountWithIntl(
					<SignupForm register={register} transition={transition} name={name} />
				);
				view.find('input[name="username"]').simulate("change", { target: { value: username } });
				view.find('input[name="password"]').simulate("change", { target: { value: password } });
				view.find('input[name="email"]').simulate("change", { target: { value: email } });

				view.find("form").simulate("submit");
				expect(register).toHaveBeenCalledWith({ email, username, password, firstName, lastName });
			});
		});

		describe("when the name provided is a single word", () => {
			it("sends the name as firstName", () => {
				const firstName = "Foo";
				const view = mountWithIntl(
					<SignupForm register={register} transition={transition} name={firstName} />
				);
				view.find('input[name="username"]').simulate("change", { target: { value: username } });
				view.find('input[name="password"]').simulate("change", { target: { value: password } });
				view.find('input[name="email"]').simulate("change", { target: { value: email } });

				view.find("form").simulate("submit");
				expect(register).toHaveBeenCalledWith({
					email,
					username,
					password,
					firstName,
					lastName: ""
				});
			});
		});

		describe("when the name provided is more than two words", () => {
			it("sends the name as firstName", () => {
				const name = "Foo Baz Bar";
				const view = mountWithIntl(
					<SignupForm register={register} transition={transition} name={name} />
				);
				view.find('input[name="username"]').simulate("change", { target: { value: username } });
				view.find('input[name="password"]').simulate("change", { target: { value: password } });
				view.find('input[name="email"]').simulate("change", { target: { value: email } });

				view.find("form").simulate("submit");
				expect(register).toHaveBeenCalledWith({
					email,
					username,
					password,
					firstName: name,
					lastName: ""
				});
			});
		});

		describe("when the email already exists", () => {
			it("the user is taken to the login page", () => {
				const email = "foo@bar.com";
				const register = () => Promise.reject({ data: { code: "RAPI-1004" } });
				const transition = jasmine.createSpy("transition function");
				const view = mountWithIntl(<SignupForm register={register} transition={transition} />);
				view.find('input[name="username"]').simulate("change", { target: { value: "f_oo-b7a.r" } });
				view
					.find('input[name="password"]')
					.simulate("change", { target: { value: "somePassword" } });
				view.find('input[name="email"]').simulate("change", { target: { value: email } });

				view.find("form").simulate("submit");
				waitsFor(() => transition.callCount > 0);
				runs(() =>
					expect(transition).toHaveBeenCalledWith("emailExists", { email, alreadySignedUp: true })
				);
			});
		});
	});
});
