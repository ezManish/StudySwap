# Full Stack Web Development student starter kit

This kit fills the practical setup and starter-file gaps in the Classroom project. Read it with assignment 00 and the editable student workbook. It contains learning inputs and blank templates, not a finished submission.

## Start in 30 to 60 minutes

You need a computer and basic JavaScript or Python syntax. Choose Python + FastAPI + SQLite for a simple backend, or a backend you can already run. Start with GET /health and a static HTML page.

1. Download and extract this ZIP into your own project folder. Open student-workbook.docx in a compatible editor or upload your own copy to Google Docs. Open CSVs using Excel, Calc or your chosen data tool; preserve an untouched raw copy. Open this README in a text editor, or use student-guide.html in a browser.
2. Read starter-brief.txt and the clarifications below. Create Brief, Research, Build, Test and Final folders.
3. Record your tool/version, one learning goal and a realistic 6–8 hours/week schedule. Complete one tiny example before scaling up.
4. Use worksheet-01.csv through worksheet-06.csv for the matching checkpoint; CSVs are blank, expandable templates and do not contain formulas. Calculate in your own working file. The DOCX has the worked examples and room for narrative.
5. Keep evidence-log.csv and file-index.csv throughout. A blank or not-run test is not a pass.

## Project rules and worked checks

Load sessions.csv into your local seed. Treat starts as project Day 8 16:00, Day 9 17:00 and Day 10 16:00 in a declared local timezone; no live calendar integration. Suggested routes: GET /sessions, GET /sessions/{id}, POST /bookings, POST /bookings/{id}/cancel. Booking requires sessionId and alias; reject unknown IDs, blank aliases, duplicate active alias/session bookings and exhausted capacity server-side. Use unique booking IDs and idempotent cancellation. Persist bookings after restart, and add a reset command using the untouched seed. Use a local development environment only. A basic tutorial health endpoint is provided; completing the project logic is your work. No authentication or real user data is required. If concurrency is not safely handled, document this as a limit instead of claiming production readiness.

## Six checkpoints

### 01 Run the smallest system

Target: project Day 7.

Task: Write stories/data model;run page and backend health endpoint.

Hand in: Setup README,entity diagram and health screenshot.

Worked method: A health endpoint proves the backend starts; it does not prove booking persistence works.

Acceptance check: Peer can start it;no secrets committed.

### 02 Define API and storage

Target: project Day 14.

Task: Specify routes/validation;seed sessions and persist bookings.

Hand in: API contract,schema/seed and request/response examples.

Worked method: POST /bookings should validate session ID and capacity on the server, even when the UI disables a full session.

Acceptance check: Handle unknown IDs,invalid inputs,duplicates and capacity.

### 03 Connect the core journey

Target: project Day 21.

Task: Implement browse,book,cancel with loading/empty/error states.

Hand in: Working app,source and demo.

Worked method: Booking S2 uses one of two places; cancelling the active booking releases one place exactly once.

Acceptance check: Booking reduces capacity;cancel releases a place.

### 04 Try to break it

Target: project Day 28.

Task: Test boundaries,malformed inputs,duplicate clicks,restart.

Hand in: 10tests,results,bug log and security/accessibility review.

Worked method: Try two requests for the last place. Document any concurrency limitation if a local implementation cannot guarantee atomicity.

Acceptance check: Include zero-capacity and server-side validation evidence.

### 05 Improve robustness

Target: project Day 35.

Task: Fix priority bugs and keyboard/phone behaviour;add useful logs.

Hand in: Revised app,before/after evidence and release notes.

Worked method: Disabling a button reduces duplicate clicks, but duplicate requests still need a server-side strategy.

Acceptance check: No dead-end errors,secrets or private logs;explain concurrency limits.

### 06 Ship reproducibly

Target: project Day 45.

Task: Package setup,seed/reset,architecture and demo.

Hand in: Source,test report,README and3-minute demo.

Worked method: A clean reviewer run should seed S1/S2/S3, create one booking, restart, then cancel the persisted booking.

Acceptance check: Clean setup completes book/cancel;state simulated elements.

## Submission and feedback

Day 1 is the learner start date agreed with the mentor. The Classroom targets are relative; no fixed calendar deadline is imposed by this master class. Complete 00, checkpoints 01–06 and the final handover. Checkpoint 07 is optional and needs an agreed extension scope. There is no automatic completion/certificate threshold; the mentor reviews the evidence against the published criteria. No response-time guarantee is specified; confirm review timing with your mentor.

In the matching assignment, choose Add or create, attach your own completed worksheet and required project files or viewable links, then Turn in. Include editable source and a PDF or README explaining how to inspect it. A screenshot alone cannot replace working code/model where required. Use CS_Track_Wxx_YourName_v1 and increase the version after feedback. Check reviewer access without making private work publicly editable.

If blocked, spend 20 minutes reducing the problem, record expected/actual results and attempts, then ask one focused question in a private comment. If peers are unavailable, use the stated self-review/role-play alternative and label it. A real runnable environment is required for coding tracks; resolve access before committing. Do not present a simulation as a real test or claim measured improvements without evidence. Credit external work and AI assistance and explain your own checks. No purchase, public deployment or real outreach is required.

## Final handover checklist

- Editable source opens from a fresh extracted copy.
- README gives exact setup, start, reset and test steps where relevant.
- Raw and working data, assumptions and units are distinguishable.
- Every required deliverable is in the file index.
- Tests have actual evidence, including failures and unresolved limits.
- Rights, sources and AI assistance are disclosed.
- Final reflection states one limitation and a next step.

## Official learning references

- python: https://docs.python.org/3/tutorial/
- web: https://developer.mozilla.org/en-US/docs/Learn_web_development
- api: https://fastapi.tiangolo.com/tutorial/

Use the current official setup instructions and record your actual versions. These references supplement the self-contained project brief.
