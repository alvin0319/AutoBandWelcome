/*
 * MIT License
 *
 * Copyright (c) 2020 alvin0319
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const axios = require("axios");
const fs = require("fs");

let token = "";
let band_key = "";
let welcomeMessage = "밴드에 가입하신것을 환영합니다!";

const ENTRYPOINT_FETCH_POSTS = "https://openapi.band.us/v2/band/posts";
const ENTRYPOINT_FETCH_COMMENTS = "https://openapi.band.us/v2/band/post/comments";
const ENTRYPOINT_WRITE_COMMENT = "https://openapi.band.us/v2/band/post/comment/create";
const regex = new RegExp(/님이 가입했습니다/g);

function loadConfig(){
	const data = JSON.parse(fs.readFileSync("config.json"));

	token = data.api_token ?? "";
	band_key = data.band_key ?? "";
	welcomeMessage = data.welcomeMessage ?? welcomeMessage;
}

function checkAPI(){
	if(token.trim() === "" || band_key.trim() === ""){
		console.log("API 키와 밴드 토큰을 config.json에 입력해주세요.");
		process.exit();
	}
}

async function proc(){
	console.log("Processing...");
	const postsData = await axios.get(ENTRYPOINT_FETCH_POSTS + `?access_token=${token}&band_key=${band_key}`);
	//console.log(postsData.data);
	const post = postsData.data;

	const commentValues = [];

	if(post.result_code === 1){
		const result_data = post.result_data.items;
		for(let value of Object.values(result_data)){
			if(regex.test(value.content)){
				const commentsData = await axios.get(ENTRYPOINT_FETCH_COMMENTS + `?access_token=${token}&band_key=${band_key}&post_key=${value.post_key}`);
				const comments = commentsData.data;
				if(comments.result_code === 1){
					let needPost = true;
					for(let commentValue of Object.values(comments.result_data.items)){
						if(commentValue.content.includes(welcomeMessage)){
							needPost = false;
							break;
						}
					}
					if(needPost){
						commentValues.push(value.post_key);
					}
				}
			}
		}
	}
	await writeComments(commentValues);
	console.log("Done!");
}

async function writeComments(posts){
	const cooldown = 10;
	let index = 1;
	for(let post of Object.values(posts)){
		const delay = cooldown * index;
		setTimeout(async() => {
			const result = await axios.post(ENTRYPOINT_WRITE_COMMENT + `?access_token=${token}&band_key=${band_key}&post_key=${post}&body=` + encodeURI(welcomeMessage), {
				params: {
					access_token: token,
					band_key: band_key,
					post_key: post,
					body: encodeURI(welcomeMessage)
				},
				headers: {
					'Content-Type': 'application/json; charset=UTF'
				}
			});
		}, (delay * 1000) + 1);
		index++;
	}
}

loadConfig();
checkAPI();

proc();

setInterval(async() => {
	await proc();
}, 1000 * 60); // 1분