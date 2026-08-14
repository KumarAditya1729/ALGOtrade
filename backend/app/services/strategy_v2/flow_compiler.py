"""Flow JSON compiler for translating CalculatedRisk visual flow to Strategy V2 python code."""

import json
from typing import Dict, Any

class FlowCompilerError(ValueError):
    pass

class FlowCompiler:
    """Translates CalculatedRisk Flow JSON into Strategy V2 python code."""
    
    def __init__(self, flow_json: Dict[str, Any]):
        self.flow = flow_json
        self.nodes = {n.get("id"): n for n in self.flow.get("nodes", [])}
        self.edges = self.flow.get("edges", [])
        self.imports = set()
        
    def compile(self) -> str:
        """Returns a valid Strategy V2 python script."""
        init_code = ["def initialize(context):"]
        
        symbols = set()
        for node in self.nodes.values():
            if node.get("type") == "place_order":
                sym = node.get("data", {}).get("symbol")
                if sym:
                    symbols.add(sym)
                    
        if symbols:
            sym_list = "[" + ", ".join(symbols) + "]"
            init_code.append(f"    context.set_universe({sym_list})")
        else:
            init_code.append("    context.set_universe('default')")
        
        handle_code = ["def handle_data(context, data):"]
        
        # very basic translation for demonstration
        # Find trigger node (e.g. Schedule or OnTick)
        trigger_nodes = [n for n in self.nodes.values() if n.get("type") in ("schedule", "on_tick", "trigger")]
        
        if not trigger_nodes:
            handle_code.append("    pass")
        else:
            for node in self.nodes.values():
                if node.get("type") == "place_order":
                    symbol = node.get("data", {}).get("symbol", "'UNKNOWN'")
                    qty = node.get("data", {}).get("quantity", 1)
                    handle_code.append(f"    context.order({symbol}, {qty})")
                elif node.get("type") == "log":
                    msg = node.get("data", {}).get("message", "''")
                    handle_code.append(f"    print({repr(msg)})")
                    
            if len(handle_code) == 1:
                handle_code.append("    pass")
        return "\n".join(init_code) + "\n\n" + "\n".join(handle_code) + "\n"
