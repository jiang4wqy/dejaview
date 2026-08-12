"""报告语言: language='en' 时给各 user-facing prompt 追加英文输出指令(覆盖写死的简体中文)。"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # backend/

from app import prompts  # noqa: E402
from app.models.schemas import (  # noqa: E402
    AuthorStatement, DuplicationVerdict, ProjectFingerprint, RepoFacts, SiteFacts, ToneMode,
)


def _fp():
    return ProjectFingerprint(one_liner="x", functional_signature="y")


def test_en_directive_appended_to_user_facing_prompts():
    site, repo, stmt = SiteFacts(), RepoFacts(), AuthorStatement()
    fp, verdict = _fp(), DuplicationVerdict()
    pairs = [
        prompts.fingerprint_synthesize(site, repo, stmt, "", "en"),
        prompts.judge_duplication(fp, [], "en"),
        prompts.synthesize_factlayer(fp, verdict, [], "en"),
        prompts.render(_Result(fp, verdict), ToneMode.ROAST, "en"),
        prompts.verify_candidate(fp, fp, "en"),
    ]
    for system, _ in pairs:
        assert "ENGLISH" in system and "OVERRIDES" in system


def test_zh_is_default_and_adds_no_directive():
    system, _ = prompts.judge_duplication(_fp(), [], "zh")
    assert "ENGLISH" not in system                       # 默认中文, 不追加英文指令
    # 默认参数省略也一样
    system2, _ = prompts.fingerprint_synthesize(SiteFacts(), RepoFacts(), AuthorStatement())
    assert "ENGLISH" not in system2


class _Result:
    """render() 只用到 fingerprint/duplication/strengths/issues/improvements 这几个属性。"""
    def __init__(self, fp, verdict):
        self.fingerprint = fp
        self.duplication = verdict
        self.strengths = []
        self.issues = []
        self.improvements = []
