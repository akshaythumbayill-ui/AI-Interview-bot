"""
LangGraph state machine for the adaptive interview flow.

States:
  INTRO  -> QUESTION -> EVALUATE -> FOLLOW_UP | NEXT_TOPIC | HARDER | EASIER -> FINAL_REPORT

The graph is intentionally lightweight — it manages state transitions and
delegates all LLM calls to the services layer.
"""

from __future__ import annotations
import logging
from typing import TypedDict, List, Optional, Annotated
import operator

from langgraph.graph import StateGraph, END

logger = logging.getLogger(__name__)


# ── State schema ──────────────────────────────────────────────────────────────

class InterviewState(TypedDict):
    """Shared mutable state passed through every node."""
    session_id: str
    role: str
    interview_type: str
    difficulty: str
    num_questions: int
    current_question: str
    current_question_number: int
    answer: str
    input_mode: str                     # voice | chat
    duration_seconds: Optional[float]
    interview_state: str                # current LangGraph node name
    history: Annotated[List[dict], operator.add]  # list of {question, answer, scores}
    resume_context: str                 # RAG-retrieved chunk for current question
    evaluation: Optional[dict]          # last EvaluationResult dict
    done: bool


# ── Nodes ─────────────────────────────────────────────────────────────────────

def node_question(state: InterviewState) -> dict:
    """Emit the current question (already set by the caller) — no LLM call here."""
    return {"interview_state": "QUESTION"}


def node_evaluate(state: InterviewState) -> dict:
    """
    Evaluate the candidate's answer via LLM and determine the next state.
    The actual LLM call is done in the route layer; here we just route.
    """
    evaluation = state.get("evaluation") or {}
    next_state = evaluation.get("interview_state", "NEXT_TOPIC")

    # Force FINAL_REPORT on last question
    if state["current_question_number"] >= state["num_questions"]:
        next_state = "FINAL_REPORT"

    return {
        "interview_state": next_state,
        "history": [{
            "question": state["current_question"],
            "answer": state["answer"],
            "scores": {
                "technical": evaluation.get("score_technical"),
                "clarity": evaluation.get("score_clarity"),
                "depth": evaluation.get("score_depth"),
            },
        }],
    }


def node_next_topic(state: InterviewState) -> dict:
    return {"interview_state": "NEXT_TOPIC", "current_question_number": state["current_question_number"] + 1}


def node_follow_up(state: InterviewState) -> dict:
    return {"interview_state": "FOLLOW_UP", "current_question_number": state["current_question_number"] + 1}


def node_harder(state: InterviewState) -> dict:
    return {"interview_state": "HARDER", "current_question_number": state["current_question_number"] + 1}


def node_easier(state: InterviewState) -> dict:
    return {"interview_state": "EASIER", "current_question_number": state["current_question_number"] + 1}


def node_final(state: InterviewState) -> dict:
    return {"interview_state": "FINAL_REPORT", "done": True}


# ── Routing ───────────────────────────────────────────────────────────────────

def route_after_evaluate(state: InterviewState) -> str:
    s = state.get("interview_state", "NEXT_TOPIC")
    if s == "FINAL_REPORT":
        return "final"
    routing = {
        "FOLLOW_UP": "follow_up",
        "HARDER": "harder",
        "EASIER": "easier",
    }
    return routing.get(s, "next_topic")


# ── Build graph ───────────────────────────────────────────────────────────────

def build_interview_graph() -> StateGraph:
    graph = StateGraph(InterviewState)

    graph.add_node("question", node_question)
    graph.add_node("evaluate", node_evaluate)
    graph.add_node("next_topic", node_next_topic)
    graph.add_node("follow_up", node_follow_up)
    graph.add_node("harder", node_harder)
    graph.add_node("easier", node_easier)
    graph.add_node("final", node_final)

    graph.set_entry_point("question")
    graph.add_edge("question", "evaluate")
    graph.add_conditional_edges("evaluate", route_after_evaluate, {
        "next_topic": "next_topic",
        "follow_up": "follow_up",
        "harder": "harder",
        "easier": "easier",
        "final": "final",
    })
    graph.add_edge("next_topic", END)
    graph.add_edge("follow_up", END)
    graph.add_edge("harder", END)
    graph.add_edge("easier", END)
    graph.add_edge("final", END)

    return graph.compile()


# Singleton compiled graph
interview_graph = build_interview_graph()
