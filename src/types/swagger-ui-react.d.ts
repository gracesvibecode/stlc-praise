declare module "swagger-ui-react" {
  import { ComponentType } from "react";
  interface SwaggerUIProps {
    url?: string;
    spec?: Record<string, unknown>;
    [key: string]: unknown;
  }
  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
