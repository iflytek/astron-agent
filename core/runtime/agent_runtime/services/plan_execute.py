from typing import Any, TypedDict

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.graph import END, START, StateGraph
from sqlalchemy import select

from agent_runtime.db.events import append_event
from agent_runtime.db.models import AgentRelease, AgentRun, ReleaseStatus, RunStatus
from agent_runtime.db.session import SessionLocal
from agent_runtime.services.adapters import (
    AdapterError,
    RunNotResumableError,
    _execute_agent,
)
from agent_runtime.services.tools import execute_tool_step
from agent_runtime.settings import Settings


class PlanState(TypedDict):
    steps: list[dict[str, Any]]
    current_index: int
    results: list[dict[str, Any]]


def initial_plan(release: AgentRelease, run: AgentRun) -> list[dict[str, Any]]:
    configured = release.snapshot.get("plan")
    raw_steps = configured
    if not isinstance(raw_steps, list) or not raw_steps:
        requirement = run.input_data.get("requirement") or run.input_data.get(
            "question"
        )
        raw_steps = [{"id": "step-1", "instruction": requirement}]
    steps: list[dict[str, Any]] = []
    for index, item in enumerate(raw_steps):
        step = item if isinstance(item, dict) else {"instruction": str(item)}
        instruction = step.get("instruction")
        tool_name = step.get("tool")
        if not tool_name and (
            not isinstance(instruction, str) or not instruction.strip()
        ):
            raise AdapterError(f"Plan step {index + 1} is missing an instruction")
        normalized = dict(step)
        normalized["id"] = str(step.get("id") or f"step-{index + 1}")
        if instruction:
            normalized["instruction"] = instruction
        steps.append(normalized)
    limits = release.snapshot.get("limits", {})
    max_steps = int(limits.get("max_steps", 10)) if isinstance(limits, dict) else 10
    if len(steps) > max(1, min(max_steps, 100)):
        raise AdapterError("Plan exceeds the published max_steps limit")
    return steps


def _assert_run_can_continue(run_id: str, release_id: str, code_version: str) -> None:
    with SessionLocal() as session:
        run = session.scalar(select(AgentRun).where(AgentRun.id == run_id))
        release = session.get(AgentRelease, release_id)
        if run is None or release is None:
            raise AdapterError("Run or release no longer exists")
        if release.status != ReleaseStatus.PUBLISHED.value:
            raise AdapterError("RELEASE_DISABLED")
        if run.cancel_requested or run.status == RunStatus.CANCEL_REQUESTED.value:
            raise AdapterError("RUN_CANCELLED")
        published_runtime = release.snapshot.get("_runtime", {})
        published_version = (
            str(published_runtime.get("version", ""))
            if isinstance(published_runtime, dict)
            else ""
        )
        if run.attempt > 1 and published_version != code_version:
            raise RunNotResumableError("RUN_NOT_RESUMABLE")


async def execute_plan(
    release: AgentRelease, run: AgentRun, settings: Settings
) -> dict[str, Any]:
    steps = initial_plan(release, run)
    builder: StateGraph[PlanState] = StateGraph(PlanState)

    async def initialize(state: PlanState) -> dict[str, Any]:
        return {
            "steps": state.get("steps") or steps,
            "current_index": state.get("current_index", 0),
            "results": state.get("results", []),
        }

    async def execute_step(state: PlanState) -> dict[str, Any]:
        index = state["current_index"]
        step = state["steps"][index]
        _assert_run_can_continue(run.id, release.id, settings.code_version)
        with SessionLocal.begin() as session:
            current = session.get(AgentRun, run.id)
            if current is None:
                raise AdapterError("Run no longer exists")
            append_event(
                session,
                current,
                "step.started",
                {
                    "index": index,
                    "instruction": step.get("instruction"),
                    "tool": step.get("tool"),
                },
                step_id=step["id"],
            )

        if step.get("tool"):
            result = execute_tool_step(run, step, state["results"])
        else:
            execution_run = AgentRun(
                id=run.id,
                trace_id=run.trace_id,
                agent_id=run.agent_id,
                release_id=run.release_id,
                release_version=run.release_version,
                mode=run.mode,
                app_id=run.app_id,
                space_id=run.space_id,
                end_user_id=run.end_user_id,
                conversation_id=run.conversation_id,
                input_data={"question": step["instruction"]},
                idempotency_key=run.idempotency_key,
                request_hash=run.request_hash,
            )
            result = await _execute_agent(release, execution_run, settings)
        with SessionLocal.begin() as session:
            current = session.get(AgentRun, run.id)
            if current is None:
                raise AdapterError("Run no longer exists")
            append_event(
                session,
                current,
                "step.completed",
                {"index": index, "result": result},
                step_id=step["id"],
            )
        return {
            "current_index": index + 1,
            "results": [*state["results"], {"step_id": step["id"], **result}],
        }

    def route(state: PlanState) -> str:
        return END if state["current_index"] >= len(state["steps"]) else "execute"

    builder.add_node("initialize", initialize)
    builder.add_node("execute", execute_step)
    builder.add_edge(START, "initialize")
    builder.add_conditional_edges("initialize", route, {"execute": "execute", END: END})
    builder.add_conditional_edges("execute", route, {"execute": "execute", END: END})
    config: RunnableConfig = {
        "configurable": {
            "thread_id": run.id,
            "checkpoint_ns": f"runtime:{release.id}",
        }
    }
    initial_state: PlanState | None = (
        {"steps": steps, "current_index": 0, "results": []}
        if run.attempt <= 1
        else None
    )
    database_url = settings.resolved_database_url()
    if database_url.startswith("sqlite"):
        graph: Any = builder.compile(checkpointer=InMemorySaver())
        final = await graph.ainvoke(
            initial_state or {"steps": steps, "current_index": 0, "results": []}, config
        )
    else:
        checkpoint_url = database_url.replace("postgresql+psycopg://", "postgresql://")
        async with AsyncPostgresSaver.from_conn_string(checkpoint_url) as checkpointer:
            await checkpointer.setup()
            graph = builder.compile(checkpointer=checkpointer)
            final = await graph.ainvoke(initial_state, config)
    return {
        "plan": final["steps"],
        "steps": final["results"],
        "content": "\n".join(
            str(item.get("content", ""))
            for item in final["results"]
            if item.get("content")
        ),
    }
