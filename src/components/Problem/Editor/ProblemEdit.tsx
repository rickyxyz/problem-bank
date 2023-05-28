import { useCallback, useState } from "react";
import "@uiw/react-markdown-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { validateFormProblem } from "@/utils";
import { ProblemDatabaseType, ProblemWithoutIdType } from "@/types";
import { PROBLEM_BLANK, PROBLEM_DEFAULT } from "@/consts";
import { Formik } from "formik";
import { ProblemEditForm, ProblemEditFormProps } from "./ProblemEditForm";
import { crudData } from "@/firebase";
import { useRouter } from "next/router";

export function ProblemEdit(props: Partial<ProblemEditFormProps>) {
  const stateLoading = useState(false);
  const setLoading = stateLoading[1];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateAnswer = useState<any>();
  const router = useRouter();

  const handleSubmit = useCallback(
    async (values: ProblemWithoutIdType) => {
      console.log("Submitting");
      setLoading(true);
      await crudData("set_problem", {
        data: {
          ...PROBLEM_DEFAULT,
          ...values,
          postDate: new Date().getTime(),
        } as unknown as ProblemDatabaseType,
      })
        .then(() => {
          router.replace("/");
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [router, setLoading]
  );

  return (
    <Formik
      initialValues={
        props.defaultProblem ??
        (PROBLEM_BLANK as unknown as ProblemWithoutIdType)
      }
      validate={validateFormProblem}
      onSubmit={handleSubmit}
      validateOnChange
    >
      <ProblemEditForm
        stateAnswer={stateAnswer}
        stateLoading={stateLoading}
        {...props}
      />
    </Formik>
  );
}
