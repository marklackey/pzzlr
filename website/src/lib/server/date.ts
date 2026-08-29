export function todayUTC(): string {
	return new Date().toISOString().slice(0, 10);
}
