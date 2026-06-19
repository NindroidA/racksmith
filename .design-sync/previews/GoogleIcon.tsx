import { GoogleIcon, Button } from "racksmith";

export const Default = () => <GoogleIcon className="h-8 w-8 text-white" />;

export const InButton = () => (
  <Button variant="secondary" iconLeft={<GoogleIcon className="h-4 w-4" />}>
    Continue with Google
  </Button>
);
