interface ViteTypeOptions {
	strictImportMetaEnv: unknown;
}

interface ImportMetaEnvironment {
	readonly VITE_WEB_BASE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnvironment;
}
