import { useCallback, useMemo, useState } from "react";
import "@uiw/react-markdown-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { PROBLEM_BLANK } from "@/consts";
import { ProblemCreateEditor } from "../components";
import { PageTemplate } from "@/templates";
import { ProblemType } from "@/types";
import { crudData } from "@/libs/firebase";
import { useDebounce } from "@/hooks";
import { useRouter } from "next/router";

export function ProblemCreatePage() {
  const stateProblem = useState<ProblemType>(
    PROBLEM_BLANK as unknown as ProblemType
  );

  const stateLoading = useState(false);
  const [, setLoading] = stateLoading;
  const debounce = useDebounce();
  const router = useRouter();

  const renderHead = useMemo(() => {
    return <h1 className="mb-8">Create Problem</h1>;
  }, []);

  const handleSubmit = useCallback(
    async (values: ProblemType) => {
      await crudData("set_problem", {
        data: values,
      })
        .then(async (res) => {
          debounce(() => {
            setLoading(false);
            if (res && res.id) router.replace(`/problem/${res.id}`);
          });
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [debounce, router, setLoading]
  );

  return (
    <PageTemplate>
      <ProblemCreateEditor
        headElement={renderHead}
        stateProblem={stateProblem}
        stateLoading={stateLoading}
        onSubmit={handleSubmit}
      />
    </PageTemplate>
  );
}