// ==UserScript==
// @name         Tool Dịch Tag Wiki SCP-VN
// @namespace    http://tampermonkey.net/
// @version      1.3.3
// @description  Tool tự động dịch tag trên Wiki SCP-VN
// @author       wolf20482
// @updateURL    https://github.com/SCP-VN-Tech/SCP-VN-Tag-Translation/raw/main/scp-vn-tag-translation.user.js
// @downloadURL  https://github.com/SCP-VN-Tech/SCP-VN-Tag-Translation/raw/main/scp-vn-tag-translation.user.js
// @match        http://scp-vn.wikidot.com/*
// @match        https://scp-vn.wikidot.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=scp-vn.wikidot.com
// @grant        none
// ==/UserScript==

const TAG_LIST = "http://scp-vn.wikidot.com/fragment:tag-guide-for-translator";
const TAG_LIST_QUERY = `query{vnTagList: page(url:"${TAG_LIST}"){wikidotInfo{source}}origEnTags: page(url:"http://scp-wiki.wikidot.com${window.location.pathname}"){wikidotInfo{tags}}}`;

"use strict";

window.parseTagList = function parseTagList(source) {
	let res = [];
	source.split("\n").forEach((line) => {
		if (line.includes("*/system:page-tags/tag/") || line.includes("KHÔNG SỬ DỤNG")) {
			let parts = line.split("||").filter(part => part !== "");
			res.push({
				en: parts[0].trim().includes("CHƯA XỬ LÝ") ? null : parts[0].trim(),
				vi: parts[1].trim().includes("KHÔNG SỬ DỤNG") ? "" : parts[1].split("/").pop().split(" ")[0].trim(),
				orig: parts[2].trim().includes("CHƯA XỬ LÝ") || parts[2].trim() == "N/A" ? null : parts[2].trim()
			});
		}
	});
	return res;
}

window.translateTags = function translateTags(data, save) {
	let sub = document.querySelector("#action-area > form > table > tbody > tr > td:nth-child(2) > div");
	try {
		let tagList = parseTagList(data.vnTagList.wikidotInfo.source);
		let tagForm = document.getElementById("page-tags-input");
		let oldTags = tagForm.value.split(" ");
		if (tagForm.value == "") {
			oldTags = data.origEnTags.wikidotInfo.tags.filter(str => !str.includes("crom:"));
		}
		let newTags = "";
		for (let i = 0; i < oldTags.length; i++) {
			let oldTag = oldTags[i];
			let translatedTag = tagList.find(entry => entry.orig == oldTag || entry.en == oldTag);
			if (oldTag == translatedTag?.orig || oldTag == translatedTag?.en) {
				newTags += translatedTag?.vi + " ";
			} else {
				newTags += oldTag + " ";
			}
		}
		tagForm.value = newTags.trim();
		sub.textContent = "Đã dịch toàn bộ tag!";
	} catch (err) {
		sub.textContent = "Đã xảy ra lỗi";
		console.log(err);
	}
	if (save) {
		return WIKIDOT.modules.PageTagsModule.listeners.save(event);
	}
}

window.fetchData = async function fetchData(query, save) {
	try {
		const response = await fetch("https://api.crom.avn.sh/graphql", {
			method: "POST",
			headers: new Headers({
				"Content-Type": "application/json"
			}),
			body: JSON.stringify({ query: query })
		});

		let sub = document.querySelector("#action-area > form > table > tbody > tr > td:nth-child(2) > div");

		if (!response.ok) {
			sub.textContent = `Đã xảy ra lỗi máy chủ`;
			return;
		}

		const { data, errors } = await response.json();

		if (errors && errors.length > 0) {
			sub.textContent = "Đã xảy ra lỗi";
			console.error(errors);
			return;
		}

		return query == translateTags(data, save);
	} catch (error) {
		sub.textContent = "Đã xảy ra lỗi";
		console.error("Fetch error: ", error);
	}
}

window.initWikidotAddTag = function initWikidotAddTag() {
	if (typeof WIKIDOT == "object") {
		try {
			WIKIDOT.page.callbacks.editTags = function (b) {
				if (!WIKIDOT.utils.handleError(b)) {
					return
				}
				$j("#action-area").html(b.body).show();
				WIKIDOT.page.utils.addCloseToActionArea();
				var buttonArea = document.querySelector("#action-area > div.buttons.form-actions");
				var translateInput = document.createElement("input");
				translateInput.type = "button";
				translateInput.classList.add("btn");
				translateInput.classList.add("btn-default");
				translateInput.value = "Dịch Tag";
				translateInput.addEventListener("click", function () {
					fetchData(TAG_LIST_QUERY, false);
				});
				buttonArea.appendChild(translateInput);

				var translateAndSaveInput = document.createElement("input");
				translateAndSaveInput.type = "button";
				translateAndSaveInput.classList.add("btn");
				translateAndSaveInput.classList.add("btn-default");
				translateAndSaveInput.value = "Dịch và Lưu Tag";
				translateAndSaveInput.addEventListener("click", function () {
					fetchData(TAG_LIST_QUERY, true);
				});
				buttonArea.appendChild(translateAndSaveInput);
			}
			console.log("Added translate buttons to tag edit interface");
		} catch (e) {
			console.error("An error occurred while trying to add translate buttons to tag edit interface");
			console.error(e);
		}
	} else {
		return setTimeout(initWikidotAddTag, 1000);
	}
}
initWikidotAddTag();
