// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { prisma } from "@/libs/prisma";
import { json } from "@/utils/api";
import {
  ContestDatabaseType,
  ContestStatusType,
  ContestType,
  ProblemContestType,
} from "@/types";
import { getAuthUserNext } from "@/libs/next-auth/helper";
import { validateFormContest } from "@/utils";
import { NextRequest, NextResponse } from "next/server";
import { API_FAIL_MESSAGE } from "@/consts/api";

export async function PATCH(req: NextRequest) {
  let errors: Record<string, string> = {};
  let response = NextResponse.json(
    {
      message: API_FAIL_MESSAGE,
    },
    {
      status: 500,
    }
  );

  try {
    const body = await req.json();

    const {
      id,
      subTopicId,
      title,
      topicId,
      description,
      problems,
      authorId,
      startAt,
      endAt,
      createdAt,
      updatedAt,
    } = body as unknown as ContestType;

    await prisma.$transaction(async (tx) => {
      await tx.contestToProblem.findMany({
        where: {
          contestId: id as unknown as number,
        },
      });

      const convertedProblems = Object.values(JSON.parse(problems)).map(
        (entry, index) => {
          const {
            problem: { id: pid },
            score,
          } = entry as ProblemContestType;
          return {
            problem: {
              connect: {
                id: pid,
              },
            },
            score,
            order: index,
          };
        }
      );

      errors = validateFormContest(body);

      if (Object.keys(errors).length > 0) {
        throw errors;
      }

      await tx.contestToProblem.deleteMany({
        where: {
          contestId: id as unknown as number,
        },
      });

      await tx.contest.update({
        where: {
          id: id as unknown as number,
        },
        data: {
          authorId,
          title,
          description,
          topicId,
          subTopicId,
          updatedAt: new Date(),
          ...(startAt ? { startAt: new Date(startAt) } : {}),
          ...(endAt ? { endAt: new Date(endAt) } : {}),
          toProblems: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: convertedProblems as any,
          },
        },
      });
    });

    response = NextResponse.json({
      message: "success",
    });
  } catch (e) {
    console.log(e);
    response = NextResponse.json(
      {
        message: API_FAIL_MESSAGE,
        ...(Object.keys(errors).length > 0 ? { errors } : {}),
      },
      {
        status: 500,
      }
    );
  }

  await prisma.$disconnect();
  return response;
}

export async function POST(req: NextRequest) {
  let errors: Record<string, string> = {};
  let response = NextResponse.json(
    {
      message: API_FAIL_MESSAGE,
    },
    {
      status: 500,
    }
  );

  try {
    const user = await getAuthUserNext();

    if (!user) throw Error("not allowed");

    const body = await req.json();

    const {
      subTopicId,
      title,
      topicId,
      description,
      problems,
      authorId,
      startAt,
      endAt,
    } = body as unknown as ContestType;

    const convertedProblems = Object.values(JSON.parse(problems)).map(
      (entry, index) => {
        const {
          problem: { id },
          score,
        } = entry as ProblemContestType;
        return {
          problem: {
            connect: {
              id,
            },
          },
          score,
          order: index,
        };
      }
    );

    errors = validateFormContest(body);

    if (Object.keys(errors).length > 0) {
      throw errors;
    }

    const contest = await prisma.contest.create({
      data: {
        authorId,
        title,
        description,
        topicId,
        subTopicId,
        createdAt: new Date(),
        updatedAt: new Date(),
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        toProblems: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: convertedProblems as any,
        },
      },
    });

    response = NextResponse.json(
      JSON.parse(json({ message: "success", id: contest.id }))
    );
  } catch (e) {
    response = NextResponse.json(
      {
        message: API_FAIL_MESSAGE,
        ...(Object.keys(errors).length > 0 ? { errors } : {}),
      },
      {
        status: 500,
      }
    );
  }

  await prisma.$disconnect();
  return response;
}

export async function GET(req: NextRequest) {
  let response = NextResponse.json(
    {
      message: API_FAIL_MESSAGE,
    },
    {
      status: 500,
    }
  );

  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    const user = await getAuthUserNext();

    if (!id) {
      throw Error("id undefined");
    }

    const rawContest = await prisma.contest.findUnique({
      where: {
        id: id as unknown as number,
      },
      include: {
        toProblems: {
          // include: {
          //   problem: true,
          // },
          select: {
            problem: true,
            score: true,
            order: true,
          },
        },
        topic: true,
        subTopic: true,
      },
    });

    if (!rawContest) throw Error("");

    const contest = { ...(rawContest as unknown as ContestDatabaseType) };

    const currentTime = new Date().getTime();
    const startTime = new Date(contest.startAt).getTime();
    const endTime = new Date(contest.endAt).getTime();

    const status: ContestStatusType = (() => {
      if (currentTime < startTime) return "waiting";
      if (currentTime > endTime) return "closed";
      return "ongoing";
    })();

    contest.toProblems ??= [];
    contest.problemsCount = contest.toProblems.length;
    contest.problemsData = contest.toProblems;
    delete contest.toProblems;

    const isAuthorized =
      user && (contest.authorId === user.id || user.role === "admin");

    if (!isAuthorized) {
      if (status === "waiting") {
        contest.problemsData = [];
      } else {
        contest.problemsData = contest.problemsData.map((entry) => ({
          ...entry,
          problem: {
            ...entry.problem,
            answer: "{}",
          },
        }));
      }
    }
    contest.status = status;

    response = NextResponse.json(JSON.parse(json(contest)));
  } catch (e) {
    console.log(e);
  }

  await prisma.$disconnect();
  return response;
}

export async function DELETE(req: NextRequest) {
  let response = NextResponse.json(
    {
      message: API_FAIL_MESSAGE,
    },
    {
      status: 500,
    }
  );
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    console.log("Try Delete -2");

    return await prisma.$transaction(async (tx) => {
      const user = await getAuthUserNext();

      console.log("Try Delete -1");

      if (id !== undefined) {
        const rawContest = await tx.contest.findUnique({
          where: {
            id: id as unknown as number,
          },
        });

        const contest = { ...rawContest } as unknown as ContestType;

        const allowDelete = true;

        user && (user.id === contest.authorId || user.role === "admin");

        console.log("Try Delete 0");

        if (!allowDelete) {
          throw Error("unauthorized");
        }

        console.log("Try Delete 1");

        await tx.contestToProblem.deleteMany({
          where: {
            contestId: id as unknown as number,
          },
        });

        await tx.contest.delete({
          where: {
            id: id as unknown as number,
          },
        });

        response = NextResponse.json({
          message: "success",
        });

        return response;
      } else {
        throw Error("id undefined");
      }
    });
  } catch (e) {
    console.log("Nope");
    console.log(e);
  }

  console.log("End");
  await prisma.$disconnect();
  return response;
}
