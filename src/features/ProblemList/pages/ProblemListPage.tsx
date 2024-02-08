import { useMemo, useEffect, useCallback, useState, useRef } from "react";
import { BsSearch } from "react-icons/bs";
import { API } from "@/api";
import { PageTemplate } from "@/templates";
import {
  Button,
  ButtonIcon,
  Input,
  Modal,
  Paragraph,
  Pagination,
} from "@/components";
import { useDebounce, useDevice } from "@/hooks";
import {
  ProblemQuery,
  ProblemSortByType,
  ProblemSubtopicNameType,
  ProblemTopicNameType,
  ProblemType,
} from "@/types";
import { ProblemCard, ProblemCardSkeleton, ProblemFilter } from "../components";
import { PROBLEM_PAGINATION_COUNT } from "@/consts";
import { useRouter } from "next/router";
import { ParsedUrlQuery } from "querystring";

interface ProblemListPageProps {
  query: ProblemQuery;
}

export function ProblemListPage({ query }: ProblemListPageProps) {
  const {
    topic: userTopic,
    subTopic: userSubTopic,
    search: userSearch,
    sort: userSort = "newest",
    page: userPage = 1,
  } = query;
  const [problems, setProblems] = useState<ProblemType[]>([]);
  const [loading, setLoading] = useState(true);
  const stateTopic = useState<ProblemTopicNameType | undefined>(userTopic);
  const [topic, setTopic] = stateTopic;
  const stateSubtopic = useState<ProblemSubtopicNameType | undefined>(
    userSubTopic
  );
  const [subtopic, setSubTopic] = stateSubtopic;
  const stateSortBy = useState<ProblemSortByType>(userSort ?? "newest");
  const [sortBy, setSortBy] = stateSortBy;
  const stateAdvanced = useState(false);
  const router = useRouter();
  const [search, setSearch] = useState(userSearch ?? "");
  const [advanced, setAdvanced] = stateAdvanced;
  const initialized = useRef(false);
  const [pagination, setPagination] = useState({
    page: userPage,
    maxPages: 1,
    count: 1,
    initialized: false,
  });
  const { device } = useDevice();
  const debounce = useDebounce();
  const lastQuery = useRef<ProblemQuery>();

  const { page } = useMemo(() => {
    const { page, maxPages, count } = pagination;

    let visiblePages = device === "mobile" ? 3 : 5;
    visiblePages = Math.min(visiblePages, maxPages);

    const half = Math.floor(visiblePages / 2);

    let newStyle = "first";

    if (page + half >= maxPages) {
      newStyle = "last";
    } else if (page - half <= 1) {
      newStyle = "first";
    } else {
      newStyle = "middle";
    }

    const from = (page - 1) * PROBLEM_PAGINATION_COUNT + 1;
    const to = Math.min(page * PROBLEM_PAGINATION_COUNT, count);

    return {
      page,
      maxPages,
      count,
      visiblePages,
      half,
      style: newStyle,
      contentFrom: from,
      contentTo: to,
    };
  }, [device, pagination]);

  // useEffect(() => {
  //   if (query.search) setSearch(query.search);
  // }, [query]);

  const handleUpdateFromQuery = useCallback(
    (newPage = userPage) => {
      setTopic(userTopic);
      setSubTopic(userSubTopic);
      setSortBy(userSort);
      setSearch(userSearch ?? "");
      setPagination((prev) => ({
        ...prev,
        page: isNaN(newPage) ? 1 : Number(newPage),
      }));
    },
    [
      setSortBy,
      setSubTopic,
      setTopic,
      userPage,
      userSearch,
      userSort,
      userSubTopic,
      userTopic,
    ]
  );

  const handleApplyQuery = useCallback(
    (newPage = userPage) => {
      const queryObject: ParsedUrlQuery = {
        ...router.query,
        search,
        topic,
        subTopic: subtopic,
        sort: sortBy,
        page: String(newPage),
      };
      if (search === "") delete queryObject.search;
      if (!topic) delete queryObject.topic;
      if (!subtopic) delete queryObject.subTopic;

      if (initialized.current) {
        // router.reload();
        router.push({
          query: queryObject,
        });
      }

      initialized.current = true;
    },
    [router, search, sortBy, subtopic, topic, userPage]
  );

  const handleGetProblem = useCallback(async () => {
    if (JSON.stringify(query) === JSON.stringify(lastQuery.current)) {
      return;
    }

    handleUpdateFromQuery();

    setLoading(true);

    const queryParams: Record<
      ProblemSortByType,
      {
        sort: keyof ProblemType;
        sortBy: "asc" | "desc";
      }
    > = {
      newest: {
        sort: "createdAt",
        sortBy: "desc",
      },
      oldest: {
        sort: "createdAt",
        sortBy: "asc",
      },
      "most-solved": {
        sort: "solveds",
        sortBy: "desc",
      },
      "least-solved": {
        sort: "solveds",
        sortBy: "asc",
      },
    };

    await API("get_problems", {
      params: {
        ...(userTopic ? { topic: userTopic } : {}),
        ...(userSubTopic ? { subTopic: userSubTopic } : {}),
        ...queryParams[userSort],
        ...(userSearch !== ""
          ? {
              search: userSearch,
            }
          : {}),
        page: isNaN(userPage) ? 1 : userPage,
      },
    })
      .then(
        ({
          data: {
            data,
            pagination: { total_records, current_page, total_pages },
          },
        }) => {
          lastQuery.current = query;

          setProblems(data);

          setPagination({
            page: current_page,
            maxPages: total_pages,
            count: total_records,
            initialized: true,
          });
          setLoading(false);
        }
      )
      .catch((e) => {
        console.log("Result:");
        console.log(e);
      });
  }, [
    handleUpdateFromQuery,
    userPage,
    userSearch,
    userSort,
    userSubTopic,
    userTopic,
  ]);

  const handleUpdate = useCallback(() => {
    debounce(() => {
      handleGetProblem();
    }, 200);
  }, [debounce, handleGetProblem]);

  useEffect(() => {
    handleUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const renderPagination = useMemo(
    () => (
      <Pagination
        pagination={pagination}
        onClick={(newPage) => {
          if (!loading) {
            handleApplyQuery(newPage);
          }
        }}
      />
    ),
    [handleApplyQuery, loading, pagination]
  );

  const renderProblems = useMemo(
    () => (
      <div className="flex flex-col gap-8">
        {loading ? (
          <ProblemCardSkeleton />
        ) : (
          problems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))
        )}
      </div>
    ),
    [loading, problems]
  );

  const renderAdvanced = useMemo(
    () =>
      device === "mobile" ? (
        <Modal stateVisible={stateAdvanced}>
          <ProblemFilter
            className="flex-col"
            stateSortBy={stateSortBy}
            stateSubTopic={stateSubtopic}
            stateTopic={stateTopic}
            wrapperClassName="flex-col bg-white w-80"
            buttonElement={
              <Button
                className="mt-4"
                onClick={() => {
                  setAdvanced(false);
                  handleApplyQuery();
                }}
                disabled={loading}
                label="Apply"
              />
            }
          />
        </Modal>
      ) : (
        <>
          {advanced && (
            <ProblemFilter
              stateSortBy={stateSortBy}
              stateSubTopic={stateSubtopic}
              stateTopic={stateTopic}
              wrapperClassName="bg-slate-200 flex-col"
              buttonElement={
                <Button
                  className="mt-4 w-fit"
                  onClick={() => handleApplyQuery()}
                  disabled={loading}
                  label="Apply"
                />
              }
            />
          )}
        </>
      ),
    [
      advanced,
      device,
      handleApplyQuery,
      loading,
      setAdvanced,
      stateAdvanced,
      stateSortBy,
      stateSubtopic,
      stateTopic,
    ]
  );

  const renderHead = useMemo(
    () => (
      <>
        <Paragraph as="h1" className="mb-8">
          Problems
        </Paragraph>
        <div className="flex flex-col">
          <Input
            externalWrapperClassName="flex-1"
            wrapperClassName="flex"
            className="!rounded-none !rounded-l-md"
            value={search}
            onChange={(e) => {
              const newSearch = e.currentTarget.value;
              setSearch(newSearch);
            }}
            rightElement={
              <ButtonIcon
                className="!px-4"
                variant="outline"
                order="last"
                orderDirection="row"
                onClick={() => {
                  // handleGetProblem();
                  handleApplyQuery(1);
                }}
                disabled={loading}
                icon={BsSearch}
              />
            }
          />
          <Paragraph
            color="primary-6"
            className="leading-8 my-2 self-end cursor-pointer select-none"
            onClick={() => {
              setAdvanced((prev) => !prev);
            }}
          >
            Advanced Search
          </Paragraph>
          {renderAdvanced}
        </div>
        {pagination.initialized && renderPagination}
      </>
    ),
    [
      search,
      loading,
      renderAdvanced,
      pagination.initialized,
      renderPagination,
      handleApplyQuery,
      setAdvanced,
    ]
  );

  return <PageTemplate head={renderHead}>{renderProblems}</PageTemplate>;
}
