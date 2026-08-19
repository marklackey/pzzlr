// Mirrors the response shapes of the backend's /api/ladder/* routes
// (website/src/lib/server/engine). Duplicated here rather than shared via a
// package because it's two tiny interfaces — revisit if the API surface
// grows enough that drift becomes a real risk.

export interface LadderPuzzle {
	start: string;
	end: string;
	length: number;
	minSteps: number;
}

export interface StepValidation {
	isWord: boolean;
	isNeighbor: boolean;
}
