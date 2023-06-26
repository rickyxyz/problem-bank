import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Dropdown,
  Icon,
  ProblemAnswer,
  ProblemStats,
  ProblemTopics,
  User,
} from "@/components";
import { md } from "@/utils";
import { ProblemType, StateType } from "@/types";
import clsx from "clsx";
import { PROBLEM_ANSWER_DEFAULT_VALUES } from "@/consts";
import { validateAnswer } from "@/utils/answer";
import { useAppSelector } from "@/redux";

export interface ProblemMainProps {
  problem: ProblemType;
  stateMode: StateType<"edit" | "view">;
}

export function ProblemMain({ problem, stateMode }: ProblemMainProps) {
  const {
    statement,
    title,
    topic,
    subtopic,
    solved = 0,
    views = 0,
    type,
    answer,
    authorId,
  } = problem;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateUserAnswer = useState<any>();
  const [userAnswer, setUserAnswer] = stateUserAnswer;
  const [userSolved, setUserSolved] = useState(false);
  const [submitted, setSubmitted] = useState<number>();
  const [cooldownIntv, setCooldownIntv] = useState<NodeJS.Timer>();
  const [cooldown, setCooldown] = useState(0);
  const user = useAppSelector("user");
  const setMode = stateMode[1];

  const statementRef = useRef<HTMLDivElement>(null);

  const handleCheckAnswer = useCallback(() => {
    const now = new Date().getTime();

    if (submitted && now - submitted <= 1000 * 5) {
      return;
    }

    console.log("This Is The Correct Answer");
    console.log(answer);

    const verdict = validateAnswer(type, answer, userAnswer);

    if (cooldownIntv) clearInterval(cooldownIntv);

    setCooldown(5000);

    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 100));
    }, 100);

    setSubmitted(now);
    setUserSolved(verdict);

    if (!verdict) setCooldownIntv(interval);
  }, [cooldownIntv, answer, submitted, type, userAnswer]);

  const renderTags = useMemo(
    () => <ProblemTopics topic={topic} subtopic={subtopic} className="mb-3" />,
    [subtopic, topic]
  );

  const renderStats = useMemo(
    () => (
      <div
        className={clsx(
          "flex w-fit items-center mb-9",
          "text-sm text-gray-600 gap-8"
        )}
      >
        <ProblemStats type="view" value={views} />
        <ProblemStats type="solved" value={solved} />
      </div>
    ),
    [solved, views]
  );

  const renderMain = useMemo(
    () => (
      <>
        <div className="flex justify-between mb-4">
          <User id={authorId} caption="3h" />
          <Dropdown
            optionWidth={100}
            direction="left"
            options={
              user && user.id === authorId
                ? [
                    {
                      id: "edit",
                      element: "Edit",
                      onClick: () => {
                        console.log("Edit");
                        setMode("edit");
                      },
                    },
                  ]
                : []
            }
            triggerElement={
              <Button className="!w-8 !h-8" variant="ghost">
                <Icon size="sm" icon="threeDots" />
              </Button>
            }
          />
        </div>
        <h1 className="mb-3">{title}</h1>
        {renderTags}
        {renderStats}
        <h2 className="mb-2">Problem Statement</h2>
        <article className="mb-9" ref={statementRef}></article>
      </>
    ),
    [authorId, renderStats, renderTags, setMode, title, user]
  );

  const renderAnswerInputs = useMemo(() => {
    if (userAnswer === undefined || !problem) return;

    return (
      <ProblemAnswer
        type={type}
        stateAnswer={stateUserAnswer}
        disabled={userSolved}
      />
    );
  }, [problem, stateUserAnswer, type, userAnswer, userSolved]);

  const renderAnswerVerdict = useMemo(() => {
    if (submitted) {
      return userSolved ? (
        <Icon icon="check" size="lg" className="text-green-600" />
      ) : (
        <Icon icon="X" size="lg" className="text-red-600" />
      );
    }
  }, [submitted, userSolved]);

  const renderAnswer = useMemo(
    () => (
      <>
        <div className="flex items-center mb-3">
          <h2>Your Answer</h2>
          {renderAnswerVerdict}
        </div>
        {renderAnswerInputs}
        <Button
          className="w-20"
          disabled={cooldown > 0 || userSolved}
          onClick={handleCheckAnswer}
        >
          {cooldown > 0 && !userSolved ? Math.ceil(cooldown / 1000) : "Submit"}
        </Button>
      </>
    ),
    [
      cooldown,
      handleCheckAnswer,
      renderAnswerInputs,
      renderAnswerVerdict,
      userSolved,
    ]
  );

  const handleRenderMarkdown = useCallback(() => {
    if (statementRef.current)
      statementRef.current.innerHTML = md.render(statement);
  }, [statement]);

  const handleInitDefaultAnswer = useCallback(() => {
    setUserAnswer(PROBLEM_ANSWER_DEFAULT_VALUES[type]);
  }, [setUserAnswer, type]);

  useEffect(() => {
    handleInitDefaultAnswer();
  }, [handleInitDefaultAnswer]);

  useEffect(() => {
    handleRenderMarkdown();
  }, [handleRenderMarkdown]);

  return (
    <Card>
      {renderMain}
      {renderAnswer}
    </Card>
  );
}
