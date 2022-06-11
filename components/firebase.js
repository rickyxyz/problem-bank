import { ref, set, child, get } from "firebase/database";
import { createContext } from "react";

export const FirebaseContext = createContext({
	app: null,
	db: null,
	_topics: null,
	_subtopics: null,
});

export async function getData(db, link) {
	return await new Promise(function (res, rej) {
		get(child(ref(db), link))
			.then((snapshot) => {
				let result = null;
				if (snapshot.exists()) {
					result = snapshot.val();
				}
				res(result);
			})
			.catch((error) => {
				rej(error);
			});
	});
}

export async function postData(db, link, data) {
	return await new Promise(function (res, rej) {
		set(ref(db, link), data).then(() => res(null)).catch((error) => rej(error));
	});
}

export function turnProblemsObjectToArray(_problems, _topics, _subtopics) {
	const tempProblems = [];

	if(!_topics || !_subtopics)
		return;

	for (let [id, _problem] of Object.entries(_problems)) {
		let { topic, subtopic } = _problem;
		const currentSubtopic = _subtopics[topic];
		console.log(currentSubtopic);

		_problem.id = id;
		_problem.topic = _topics[topic];
		_problem.subtopic = currentSubtopic ? currentSubtopic[subtopic] : "Unknown";
		tempProblems.unshift(_problem);
	}

	return tempProblems;
}

export async function setProblemsFromSnapshot(snapshot, condition, callback) {
	if (condition) {
		callback(
			// Since we get an object (not array) as a result, we convert them to array first.
			turnProblemsObjectToArray(
				snapshot.val(),
				_topics,
				_subtopics
			)
		);
	}
}

export function getErrorMessage(code) {
	switch (code) {
		case "auth/email-already-in-use":
			return { type: "email", message: "This email is already used." };
		case "auth/invalid-email":
			return { type: "email", message: "This email is invalid." };
		case "auth/user-not-found":
			return { type: "email", message: "This account does not exist." };
		case "auth/weak-password":
			return { type: "password", message: "The password is too weak." };
		case "auth/wrong-password":
			return { type: "password", message: "Wrong password." };
		default:
			return {
				type: "generic",
				message: "Something went wrong. Please try again later.",
			};
	}
}