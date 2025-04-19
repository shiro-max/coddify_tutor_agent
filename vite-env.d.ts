// src/vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_ENDPOINT: string;
    // တခြား env variables တွေရှိရင် ဒီမှာထပ်ထည့်ပါ
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}