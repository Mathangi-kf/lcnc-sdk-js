import { BaseSDK } from "./base";
import { LISTENER_CMDS } from "./constants";
import { Form } from "./form";
import { TableForm } from "./form";
import { Client } from "./client";
import { Formatter } from "./formatter";
import { Application } from "./app";
import { Page } from "./page";
import { Component } from "./component";

import { SDKContext, userObject, accountObject } from "./sdk.types";

class LowcodeSDK extends BaseSDK {
	context: Component | Form | TableForm | Page;
	client: Client;
	formatter: Formatter;
	app: Application;
	user: userObject;
	account: accountObject;

	constructor(props: SDKContext) {
		super({});
		if (props.tableId && props.tableRowId) {
			this.context = new TableForm(
				props.formInstanceId,
				props.tableId,
				props.tableRowId
			);
		} else if (props.formInstanceId) {
			this.context = new Form(props.formInstanceId);
		} else if (props.pageId && !props.componentId) {
			this.context = new Page(props);
		} else if (props.componentId) {
			this.context = new Component(props);
		}
		this.client = new Client({});
		this.formatter = new Formatter({});
		if (props.appId) {
			this.app = new Application(props);
		}
		this.user = props.user;
		this.account = props.account;
	}
	api(url: string, args = {}): string | object {
		return this._postMessageAsync(LISTENER_CMDS.API, { url, args });
	}
	// getContext(): string | object {
	// 	return this._postMessageAsync(LISTENER_CMDS.GET_CONTEXT, {});
	// }
}

function initSDK(config: SDKContext): LowcodeSDK {
	return new LowcodeSDK(config);
}

export default initSDK;
