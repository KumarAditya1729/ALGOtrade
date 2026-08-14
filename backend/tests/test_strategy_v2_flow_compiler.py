import pytest
from app.services.strategy_v2.flow_compiler import FlowCompiler
from app.services.strategy_v2.contract import compile_strategy_v2, DiscoveryContext

def test_flow_compiler_basic():
    flow_json = {
        "nodes": [
            {"id": "1", "type": "trigger", "data": {}},
            {"id": "2", "type": "log", "data": {"message": "Hello World"}},
            {"id": "3", "type": "place_order", "data": {"symbol": "'AAPL'", "quantity": 10}}
        ],
        "edges": []
    }
    compiler = FlowCompiler(flow_json)
    code = compiler.compile()
    
    assert "def initialize(context):" in code
    assert "def handle_data(context, data):" in code
    assert "print('Hello World')" in code
    assert "context.order('AAPL', 10)" in code

    # verify it compiles with safe_exec via strategy V2
    compiled = compile_strategy_v2(code)
    assert compiled.handler("initialize") is not None
    assert compiled.handler("handle_data") is not None
