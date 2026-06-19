import { GithubIcon, Button } from "racksmith";

export const Default = () => <GithubIcon className="h-8 w-8 text-white" />;

export const InButton = () => (
  <Button variant="secondary" iconLeft={<GithubIcon className="h-4 w-4" />}>
    Continue with GitHub
  </Button>
);
