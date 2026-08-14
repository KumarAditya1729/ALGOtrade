# Integration Baseline

## OpenAlgo
- **Commit SHA**: `6ec27097183fdce3b5467a549e15c7b4efeae989`
- **Branch**: `main`
- **Dependencies**: Python 3.12+ (uv/pip), Node 20.20+ (npm)

### Verification
- **Backend Tests**: <span style="color:red">RED (Existing failures)</span>
  - `pytest test/` fails during collection due to missing `eventlet` dependency and an import error (`cannot import name 'get_telegram_bot'`).
- **Frontend Tests**: <span style="color:yellow">YELLOW (Working with warnings)</span>
  - React/Vitest suite mostly passes (453 passed).
  - <span style="color:red">RED:</span> `useOptionChainPreferences.test.ts` fails (10 tests) due to `localStorage` not being available in the test environment (`TypeError: Cannot read properties of undefined (reading 'clear')`).

## QuantDinger
- **Commit SHA**: `e64e1c227bf3174e441a42143620179b286387e1`
- **Branch**: `main`
- **Dependencies**: Python 3.12+ (pip). Frontend not in this repository.

### Verification
- **Backend Tests**: <span style="color:red">RED (Existing failures)</span>
  - `pytest tests/` failed with 45 failures out of 1387 tests, mostly in `test_grid_engine.py` and `test_position_query.py`. There are also several DeprecationWarnings related to `asyncio` and `py_mini_racer`.
