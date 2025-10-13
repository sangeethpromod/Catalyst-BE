import { Router } from "express";
import { testAgent } from "../controllers/agent.controller.js";

const router = Router();

router.get("/test/:name", testAgent);

export default router;
