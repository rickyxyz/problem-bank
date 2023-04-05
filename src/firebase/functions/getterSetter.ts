import { child, get, ref, set } from "firebase/database";
import { db } from "../config";
import { addDoc, collection, doc, getDoc, getDocs } from "firebase/firestore";
import {
  CRUD_PATH_PROPERTIES,
  CrudMapPathToParams,
  CrudMapPathToReturnTypes,
  CrudPathType,
} from "../types";
import { ProblemAnswerType, ProblemType } from "@/types";

export async function getAllDataFromPath(group: string) {
  const querySnapshot = await getDocs(collection(db, group));

  const data: any[] = [];
  querySnapshot.forEach((doc) => {
    data.push({
      id: doc.id,
      ...doc.data()[group],
    });
  });

  return data;
}

export async function getDataFromPath(group: string, id: string) {
  const docRef = doc(db, group, id);
  const docSnap = await getDoc(docRef);

  return docSnap.exists()
    ? {
        id,
        ...docSnap.data()[group],
      }
    : undefined;
}

export async function setDataToPath(group: string, data: object) {
  return addDoc(collection(db, group), data);
}

export async function crudData<K extends CrudPathType>(
  path: K,
  data: CrudMapPathToParams[K]
) {
  const { type, collection, group = false } = CRUD_PATH_PROPERTIES[path];

  switch (type) {
    case "create":
      if (path === "set_problem" && data.problem.type === "matrix") {
        await setDataToPath(collection, {
          ...data,
          problem: {
            ...data.problem,
            answer: JSON.stringify(data.problem.answer),
          },
        });
      } else {
        await setDataToPath(collection, data);
      }
      break;
    case "read":
      let readResult: any = undefined;
      const { id } = data;
      if (group) {
        readResult = await getAllDataFromPath(collection);
      } else if (id) {
        readResult = await getDataFromPath(collection, data.id);
        if (readResult && path === "get_problem") {
          (readResult as ProblemType).id = id;

          if ((readResult as ProblemType).type === "matrix") {
            (readResult as any).answer = JSON.parse((readResult as any).answer);
          }
        }
      }
      return readResult as CrudMapPathToReturnTypes[K];
    case "update":
      await setDataToPath(collection, data);
      break;
  }

  return null;
}
