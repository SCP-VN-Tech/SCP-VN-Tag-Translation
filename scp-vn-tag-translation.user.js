// ==UserScript==
// @name         Tool Dịch Tag Wiki SCP-VN
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Tool tự động dịch tag trên Wiki SCP-VN
// @updateURL    https://github.com/SCP-VN-Tech/SCP-VN-Tag-Translation/raw/main/scp-vn-tag-translation.user.js
// @downloadURL  https://github.com/SCP-VN-Tech/SCP-VN-Tag-Translation/raw/main/scp-vn-tag-translation.user.js
// @match        http://scp-vn.wikidot.com/*
// @match        https://scp-vn.wikidot.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikidot.com
// @grant        none
// ==/UserScript==

// Some portions derived from https://github.com/scpwiki/SCP-Wiki-Staff-Identification
// TOML parser derived from https://github.com/BinaryMuse/toml-node

"use strict";
var day = 1000 * 60 * 60 * 24;

// Parse tag translations TOML, replace tags in tag input with translated tags
window.translateTags = function translateTags(responseText, sub) {
	var tagList = tomlParse(responseText);
	var tagForm = document.getElementById("page-tags-input");
	var newTags = tagForm.value;
	for (var i = 0; i < tagList.tags.length; i++) {
		newTags = newTags.replaceAll(new RegExp(`\\b${tagList.tags[i].en}\\b`, "gi"), tagList.tags[i].vi);
	}
	tagForm.value = newTags;
	sub.textContent = "Đã dịch toàn bộ tag!";
}

window.translateTagsAndSave = function translateTagsAndSave(responseText, sub) {
	translateTags(responseText, sub);
	return WIKIDOT.modules.PageTagsModule.listeners.save(event);
}

// Get tag translations TOML from http://scp-vn.wdfiles.com/local--code/tag-guide-for-translator/3
window.getTagTranslations = function getTagTranslations(save) {
	var sub = document.querySelector("#action-area > form > table > tbody > tr > td:nth-child(2) > div");
	sub.textContent = "Đang truy xuất thông tin tag dịch...";
	var lastFetchedTimestamp = localStorage.getItem("scp-vn-tag-translations-timestamp");
	var lastFetchedResponse = localStorage.getItem("scp-vn-tag-translations-response");
	var useCachedResponse =
		lastFetchedTimestamp != null &&
		lastFetchedResponse != null &&
		new Date(lastFetchedTimestamp).getTime() + day > new Date().getTime();

	if (useCachedResponse) {
		console.info("Using cached tag translation list");
		if (save) {
			translateTagsAndSave(lastFetchedResponse, sub);
		} else {
			translateTags(lastFetchedResponse, sub);
		}
	} else {
		console.info("Fetching tag translation list");
		var _xhr = () => {
			if (window.XMLHttpRequest) {
				return new XMLHttpRequest();
			}
			if (window.ActiveXObject) {
				try {
					return new ActiveXObject("Msxml2.XMLHTTP.6.0");
				} catch (e) { }
				try {
					return new ActiveXObject("Msxml2.XMLHTTP.3.0");
				} catch (e) { }
				try {
					return new ActiveXObject("Microsoft.XMLHTTP");
				} catch (e) { }
			}
			return false;
		}
		var request = _xhr();
		request.open("GET", `https://api.codetabs.com/v1/proxy?quest=http://scp-vn.wdfiles.com/local--code/tag-guide-for-translator/3`, true);
		request.timeout = 10000;
		request.addEventListener("readystatechange", function () {
			if (request.readyState === XMLHttpRequest.DONE) {
				try {
					if (request.status === 200) {
						localStorage.setItem("scp-vn-tag-translations-timestamp", new Date());
						localStorage.setItem("scp-vn-tag-translations-response", request.responseText);
						if (save) {
							translateTagsAndSave(request.responseText, sub);
						} else {
							translateTags(request.responseText, sub);
						}
					} else {
						sub.textContent = "Đã xảy ra lỗi máy chủ khi truy xuất dữ liệu, vui lòng thử lại sau";
						console.error(`Server Error (${request.status})`);
					}
				} catch (err) {
					sub.textContent = "Đã xảy ra lỗi phần mềm khi truy xuất dữ liệu, vui lòng báo cáo lỗi";
					console.error(`An error has occurred:`);
					console.error(err);
				}
			}
		});
		request.send();
	}
}

// Load TOML parser JavaScript
window.loadTomlParser = function loadTomlParser() {
	var script = document.createElement("script");
	script.type = "text/javascript";
	script.src = "https://cdn.jsdelivr.net/gh/SCP-VN-Tech/SCP-VN-Tag-Translation/toml-parser.min.js";
	document.head.appendChild(script);
	console.log("Loaded TOML parser.");
}

// Show "Translate Tags" button and "Translate and Save Tags" button when the tag edit interface is opened
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
					getTagTranslations(false);
				});
				buttonArea.appendChild(translateInput);

				var translateAndSaveInput = document.createElement("input");
				translateAndSaveInput.type = "button";
				translateAndSaveInput.classList.add("btn");
				translateAndSaveInput.classList.add("btn-default");
				translateAndSaveInput.value = "Dịch và Lưu Tag";
				translateAndSaveInput.addEventListener("click", function () {
					getTagTranslations(true);
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

loadTomlParser();
initWikidotAddTag();
