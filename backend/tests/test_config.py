"""公开 API 配置解析测试。"""
from app.config import Settings


def test_cors_origins_are_parsed_and_trimmed():
    settings = Settings(cors_origins="https://one.example, https://two.example ,, ")

    assert settings.cors_origin_list == ["https://one.example", "https://two.example"]


def test_cors_default_is_local_only():
    assert "*" not in Settings().cors_origin_list
    assert "http://localhost:3000" in Settings().cors_origin_list
