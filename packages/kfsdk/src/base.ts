import { nanoid } from "nanoid";

import { globalInstances } from "./utils";
import { LISTENER_CMDS } from "./constants";

export function generateId(prefix = "lcncsdk") {
	return `${prefix}-${nanoid()}`;
}

function postMessage(args: any) {
	// console.log("SDK : @postMessage ", args);
	if (self.parent && self.parent !== self) {
		self.parent.postMessage(args, "*");
	} else {
		self.postMessage(args);
	}
}

export class BaseSDK {
	#listeners: any;
	#eventListeners: object;
	constructor(props: any) {
		// console.log("SDK : Initializing ", props);
		this.#listeners = {};
		this.#eventListeners = {};
		self.addEventListener("message", this.#onMessage.bind(this), false);
	}

	#addListener(_id: string, callback: any) {
		this.#listeners[_id] = this.#listeners[_id] || [];
		this.#listeners[_id].push(callback);
	}

	#appendEventListeners(_id: string, eventType: string, callback: any) {
		if (!this.#eventListeners[_id]) {
			this.#eventListeners[_id] = {};
		}
		this.#eventListeners[_id][eventType] = callback;
	}

	_postMessageAsync(
		command: string,
		args: any,
		hasCallBack?: boolean,
		callBack?: (data: any) => {}
	): object | string | any {
		return new Promise((resolve, reject) => {
			const _id = generateId(command.toLowerCase());
			postMessage({ _id, command, ...args });
			this.#addListener(_id, async (data: any) => {
				if (data?.errorMessage) {
					reject(data);
				} else {
					if (hasCallBack && callBack) {
						data = await callBack(data);
					}
					resolve(data);
				}
			});
		});
	}

	_postMessage(command: string, func: (data: any) => void, args = {}) {
		const _id = generateId(command.toLowerCase());
		postMessage({ _id, command, ...args });
		this.#addListener(_id, (data: any) => func(data));
	}

	_postMessageSync(command:string, args = {}) {
		const _id = generateId(command.toLowerCase());
		const sab = new SharedArrayBuffer(1024 * 1024);
		const int32Array = new Int32Array(sab);
		int32Array[0] = 0;
		postMessage({ _id, command, sab: sab, ...args });
		Atomics.wait(int32Array, 0, 0);
		let result = "";
		let dataLength = Atomics.load(int32Array, 0);
		for(let i = 1; i <= dataLength; i++) {
			result += String.fromCharCode(int32Array[i]);
		}
		return JSON.parse(result).value;
	}

	_registerEventListener(_id: string, eventType: string, callback: any) {
		this.#appendEventListeners(_id, eventType, callback);
	}

	#checkEvents(event: any) {
		const { _id, target, data, eventName, eventParams } = event;
		if (!target) return;
		// const eventListener = this.#eventListeners[_id] || {};
		// if (eventListener[eventType]) {
		// 	eventListener[eventType](eventParams || {});
		// }
		globalInstances[target]?.triggerEvent(eventName, data);
	}

	#onMessage(event: any) {
		if (event.origin !== self.location.origin) {
			// console.log("SDK : @onMessage ", event);
			const data = event.data;
			if (data.isEvent) {
				return this.#checkEvents(data);
			}
			const _req = data?._req || {};
			let listeners = this.#listeners[_req?._id] || [];
			if (listeners) {
				listeners.forEach((listener: any) => {
					try {
						if (
							data.resp &&
							Object.keys(data.resp).length === 1 &&
							_req.command !== LISTENER_CMDS.API
						) {
							listener(Object.values(data.resp)[0]);
						} else {
							listener(data.resp);
						}
					} catch (err) {
						console.error("Message callback error: ", err);
					}
				});
			}
		}
	}
}
