/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useEffect, useCallback, useState } from "react";
import { crudData } from "@/libs/firebase";
import {
  ProblemType,
  ContentViewType,
  UserType,
  ContentAccessType,
} from "@/types";
import { PROBLEM_BLANK } from "@/consts";
import { ProblemDetailMainSkeleton } from "../components/ProblemDetailMainSkeleton";
import { ProblemDetailMain } from "../components";
import { PageTemplate } from "@/templates";
import { ProblemCreateEditor } from "@/features/ProblemCreate";
import { checkPermission, parseAnswer, parseTopicId } from "@/utils";
import { Button, ButtonOrderType, Crumb, Paragraph } from "@/components";
import { useIdentity } from "@/features/Auth";
import clsx from "clsx";
import { useRouter } from "next/router";
import { useDebounce } from "@/hooks";
import { api } from "@/utils/api";
import { ProblemEditPage } from "@/features/ProblemCreate/pages/ProblemEditPage";
import { Session } from "next-auth";

interface ProblemData {
  name: string;
  value?: string | number;
}

interface ProblemAction {
  name: string;
  permission?: ContentAccessType;
  handler: () => void;
}

interface ProblemProps {
  id: string;
  user: UserType;
}

export function ProblemDetailPage({ id, user }: ProblemProps) {
  const stateProblem = useState<ProblemType>(
    PROBLEM_BLANK as unknown as ProblemType
  );
  const [problem, setProblem] = stateProblem;
  const { title, topic, subTopic, authorId, solved } = problem;
  const stateAccept = useState<unknown>({
    content: "",
  });
  const [accept, setAccept] = stateAccept;
  const stateLoading = useState(true);
  const [loading, setLoading] = stateLoading;
  const stateMode = useState<ContentViewType>("view");
  const [mode, setMode] = stateMode;
  const router = useRouter();
  const debounce = useDebounce();

  const permission = useMemo<ContentAccessType>(() => {
    if (user && problem) {
      if (problem.authorId === user.id) {
        return "author";
      }
    }
    return "viewer";
  }, [problem, user]);

  const problemData = useMemo<ProblemData[]>(
    () => [
      {
        name: "Author",
        value: authorId,
      },
      {
        name: "Solved",
        value: (solved ?? []).length,
      },
    ],
    [authorId, solved]
  );

  const handleDeleteProblem = useCallback(async () => {
    await api
      .delete("/problem", {
        params: {
          id,
        },
      })
      .then(() => {
        console.log("problem deleted");
        router.push("/");
      })
      .catch((e) => {
        console.log("Result:");
        console.log(e);
        return null;
      });
  }, [id, router]);

  const problemAction = useMemo<ProblemAction[]>(
    () => [
      {
        name: "Edit",
        handler: () => {
          setMode("edit");
        },
        permission: "author",
      },
      {
        name: "Delete",
        handler: handleDeleteProblem,
        permission: "author",
      },
      {
        name: "Bookmark",
        handler: () => {
          return 0;
        },
        permission: "viewer",
      },
    ],
    [handleDeleteProblem, setMode]
  );

  const renderEditHeader = useMemo(
    () => <h1 className="mb-8">Edit Problem</h1>,
    []
  );

  const renderQuestion = useMemo(() => {
    if (loading || !problem) return <ProblemDetailMainSkeleton />;

    return (
      <ProblemDetailMain
        stateProblem={stateProblem}
        stateAccept={stateAccept}
        stateMode={stateMode}
      />
    );

    // <ProblemCreateEditor
    //   headElement={renderEditHeader}
    //   stateProblem={stateProblem}
    //   purpose="edit"
    //   handleUpdateProblem={(data) => {
    //     setMode("view");
    //     setProblem((prev) => ({
    //       ...prev,
    //       ...data,
    //     }));
    //     console.log("UP");
    //     console.log(data.type);
    //     console.log(data.answer);
    //     console.log();
    //     setAccept(parseAnswer(data.type, data.answer));
    //   }}
    //   onLeaveEditor={() => {
    //     setMode("view");
    //   }}
    // );
  }, [loading, problem, stateProblem, stateAccept, stateMode]);

  const handleGetProblems = useCallback(async () => {
    if (!loading) return;

    setLoading(true);

    await api
      .get("/problem", {
        params: {
          id,
        },
      })
      .then(({ data }) => {
        const { type, answer } = data as ProblemType;
        setProblem(data);
        setAccept(parseAnswer(type, answer));
        setLoading(false);
        // console.log("Result:");
        // console.log(res.data);
        // return res.data;
        // setProblems(r)
      })
      .catch((e) => {
        console.log("Result:");
        console.log(e);
        return null;
      });

    // await crudData("get_problem", {
    //   id,
    // }).then((result) => {
    //   if (result) {
    //     setProblem(result as ProblemType);
    //     setAccept(parseAnswer(result.type, result.answer));
    //     setLoading(false);
    //   }
    // });
  }, [id, loading, setAccept, setLoading, setProblem]);

  useEffect(() => {
    handleGetProblems();
  }, [handleGetProblems]);

  const renderBreadCrumb = useMemo(
    () => (
      <Crumb
        crumbs={[
          {
            text: "Problems",
          },
          {
            text: topic?.name,
          },
          {
            text: subTopic?.name,
          },
          {
            text: title,
            color: "secondary-4",
          },
        ]}
      />
    ),
    [subTopic?.name, title, topic?.name]
  );

  const renderHead = useMemo(
    () => (
      <>
        {renderBreadCrumb}
        <h1 className="mb-8">{title}</h1>
      </>
    ),
    [renderBreadCrumb, title]
  );

  const renderProblemData = useMemo(
    () => (
      <ul className="w-48">
        {problemData.map(({ name, value }, idx) => (
          <li
            className={clsx("flex justify-between", idx > 0 && "mt-1")}
            key={name}
          >
            <Paragraph color="secondary-6">{name}</Paragraph>
            <Paragraph>{value}</Paragraph>
          </li>
        ))}
      </ul>
    ),
    [problemData]
  );

  const renderProblemAction = useMemo(
    () => (
      <ul className="w-48">
        {problemAction
          .filter(({ permission: perm }) => checkPermission(permission, perm))
          .map(({ name, handler }, idx) => {
            let order: ButtonOrderType | undefined = "middle";
            if (idx === 0) order = "first";
            if (idx === problemAction.length - 1) order = "last";
            if (problemAction.length === 1) order = undefined;

            return (
              <li key={name}>
                <Button
                  className="!w-full !pl-8"
                  variant="outline"
                  alignText="left"
                  order={order}
                  onClick={handler}
                >
                  {name}
                </Button>
              </li>
            );
          })}
      </ul>
    ),
    [permission, problemAction]
  );

  const renderSide = useMemo(
    () => (
      <div className="flex flex-col gap-8">
        {renderProblemData}
        {renderProblemAction}
      </div>
    ),
    [renderProblemAction, renderProblemData]
  );

  const renderViewProblem = useMemo(
    () => (
      <PageTemplate
        className="w-full"
        head={!loading && renderHead}
        side={!loading && renderSide}
      >
        {renderQuestion}
      </PageTemplate>
    ),
    [loading, renderHead, renderQuestion, renderSide]
  );

  const handleSubmitEdit = useCallback(
    async (values: ProblemType) => {
      const { id } = problem;
      await crudData("update_problem", {
        id: id ?? "invalid",
        data: values,
      })
        .then(async () => {
          setLoading(false);
          debounce(() => {
            router.replace(`/problem/${id}`);
          });
          setMode("view");
          setProblem((prev) => ({
            ...prev,
            ...values,
          }));
          setAccept(parseAnswer(values.type, values.answer));
        })
        .catch(() => {
          setLoading(false);
        });
    },
    [debounce, problem, router, setAccept, setLoading, setMode, setProblem]
  );

  const renderEditProblem = useMemo(
    () => (
      <PageTemplate>
        {/* <ProblemCreateEditor
          headElement={<h1 className="mb-8">Edit Problem</h1>}
          stateProblem={stateProblem}
          stateLoading={stateLoading}
          onSubmit={handleSubmitEdit}
          onLeaveEditor={() => {
            setMode("view");
          }}
        /> */}
        <ProblemEditPage
          stateProblem={stateProblem}
          onEdit={() => {
            setMode("view");
          }}
          onLeaveEditor={() => {
            setMode("view");
          }}
        />
      </PageTemplate>
    ),
    [setMode, stateProblem]
  );

  return mode === "edit" ? renderEditProblem : renderViewProblem;
}
