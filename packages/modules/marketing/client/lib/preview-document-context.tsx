import { createContext, useContext } from "react";

const PreviewDocumentContext = createContext<Document | null>(null);

/** Theme Editor 预览 iframe 的 document；实站组件用宿主 `document`。 */
export function usePreviewDocument(): Document {
  return useContext(PreviewDocumentContext) ?? document;
}

export { PreviewDocumentContext };
