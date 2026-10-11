import { Code } from "../components/Code";
import { C, Callout, P, PageHeader, Section } from "../components/Section";
import { usePageTitle } from "../site/use-page-title";

const APP_TSX = `import { useChatStream, type AgentStreamEvent, type ChatTransport } from "@hiro/niru-chat-kit";
import { ChatKitProvider, FullChat } from "@hiro/niru-chat-kit/mui";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A stand-in transport that answers by repeating what you typed, one word at a time.
// Replace it with a call to your own backend when you are ready.
const transport: ChatTransport = {
  async send(turn, signal) {
    async function* frames(): AsyncGenerator<AgentStreamEvent> {
      yield { event: "status", data: { status: "started", conversation_id: "c1", thread_id: "t1", principal_id: "me", run_id: "run-1" } };
      for (const word of \`You said: \${turn.message}\`.split(" ")) {
        await sleep(120);
        if (signal.aborted) return;
        yield { event: "token", data: { text: \`\${word} \` } };
      }
      yield { event: "result", data: { status: "completed", message: \`You said: \${turn.message}\`, conversation_id: "c1", thread_id: "t1" } };
      yield { event: "done", data: {} };
    }
    return frames();
  },
  stop: async () => false,
};

export default function App() {
  const stream = useChatStream(transport);
  return (
    <ChatKitProvider>
      <div style={{ height: "100vh" }}>
        <FullChat stream={stream} agent={{ name: "Assistant", initial: "A" }} />
      </div>
    </ChatKitProvider>
  );
}`;

export default function Installation() {
  usePageTitle("Installation");
  return (
    <>
      <PageHeader
        title="Installation"
        lead="We'll go from an empty folder to a React app with a working chat in it. Budget about ten minutes."
      />
      <P>
        The kit is not on npm. You install it straight from its GitHub repository, and your package manager builds it during the install. The steps below use
        pnpm. If you use npm or yarn, the commands are in the notes after the steps.
      </P>
      <Section title="From an empty app to a working chat">
        <P>You need Node 20 or newer and pnpm 10.</P>
        <ol>
          <li>
            <P>Create a React app with Vite. Choose the React and TypeScript options if it asks.</P>
            <Code language="sh" code={`pnpm create vite my-chat --template react-ts
cd my-chat`} />
          </li>
          <li>
            <P>Install the app&apos;s own dependencies.</P>
            <Code language="sh" code={`pnpm install`} />
          </li>
          <li>
            <P>
              Find the commit you want to install. Pinning a commit means every install gets exactly the same code. This prints a 40-character commit id
              followed by <C>refs/heads/main</C>. Copy the id.
            </P>
            <Code language="sh" code={`git ls-remote https://github.com/HiroLabz/niru-chat-kit.git refs/heads/main`} />
          </li>
          <li>
            <P>
              Tell pnpm it may run the kit&apos;s build step. The next section explains why. Create a file called <C>pnpm-workspace.yaml</C> next to{" "}
              <C>package.json</C> and paste this in, with your 40-character commit id in place of <C>&lt;full-commit-sha&gt;</C>.
            </P>
            <Code language="yaml" code={`allowBuilds:
  '@hiro/niru-chat-kit@https://codeload.github.com/HiroLabz/niru-chat-kit/tar.gz/<full-commit-sha>': true`} />
          </li>
          <li>
            <P>
              Install the kit, using the same commit id. You should see pnpm finish without errors. A short wait is normal, because the kit is compiled on your
              machine.
            </P>
            <Code language="sh" code={`pnpm add github:HiroLabz/niru-chat-kit#<full-commit-sha>`} />
          </li>
          <li>
            <P>Install the libraries the kit draws with. These are required.</P>
            <Code language="sh" code={`pnpm add @mui/material @mui/icons-material @emotion/react @emotion/styled react-markdown remark-gfm marked`} />
          </li>
          <li>
            <P>
              Optional: install <C>shiki</C> if you want code in replies to be coloured. Without it code still appears, as plain text. If you also want
              maths in replies, install the three maths packages as well.
            </P>
            <Code language="sh" code={`pnpm add shiki
pnpm add remark-math rehype-katex katex`} />
          </li>
          <li>
            <P>
              Open <C>src/index.css</C> and delete everything in it. The styles Vite puts there centre the page and would squeeze the chat into a narrow
              strip.
            </P>
          </li>
          <li>
            <P>
              Open <C>src/App.tsx</C>, delete everything in it and paste this. It is a complete chat with a stand-in backend that echoes what you type.
            </P>
            <Code code={APP_TSX} />
          </li>
          <li>
            <P>Start the app.</P>
            <Code language="sh" code={`pnpm dev`} />
          </li>
          <li>
            <P>
              Open the address it prints (usually <C>http://localhost:5173</C>). You should see a full-page chat with a message box at the bottom. Type
              hello and press Enter. The reply, &quot;You said: hello&quot;, should appear one word at a time.
            </P>
          </li>
        </ol>
        <P>
          If that works, the kit is installed. The only part left is the transport: swap the stand-in for one that talks to your backend. Writing a transport
          shows how.
        </P>
      </Section>
      <Section title="Why pnpm 10 needs the allow-builds step">
        <P>
          The kit ships as source and is compiled when you install it. pnpm 10 blocks that compile step for any dependency unless you allow it by name. For a
          package that comes from GitHub, the name includes the commit, which is why the line in <C>pnpm-workspace.yaml</C> contains the commit id.
        </P>
        <P>
          If you skip the step, <C>pnpm add</C> fails with <C>ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED</C>. The message prints the exact address pnpm wants. You
          can paste that address into <C>allowBuilds</C> in place of the one above.
        </P>
        <P>
          The line names one commit, so when you move to a newer commit, change it in both places: the id you pass to <C>pnpm add</C> and the id in{" "}
          <C>pnpm-workspace.yaml</C>. If your app already uses <C>onlyBuiltDependencies</C> instead of <C>allowBuilds</C>, add the same address there. If you
          build in Docker, copy <C>pnpm-workspace.yaml</C> into the image before the <C>pnpm install</C> line.
        </P>
        <Callout title="npm and yarn">
          They do not block the build, so there is no extra file. Use <C>npm install github:HiroLabz/niru-chat-kit#&lt;commit&gt;</C> or{" "}
          <C>yarn add HiroLabz/niru-chat-kit#&lt;commit&gt;</C> in the install step and skip the pnpm-workspace.yaml step.
        </Callout>
      </Section>
      <Section title="Updating later">
        <P>Look up the newest commit, then install it and update the id in the allow-builds line.</P>
        <Code language="sh" code={`git ls-remote https://github.com/HiroLabz/niru-chat-kit.git refs/heads/main
pnpm add github:HiroLabz/niru-chat-kit#<that-commit>`} />
      </Section>
      <Section title="Notes for other setups">
        <P>
          Next.js: the package ships compiled ES modules with type declarations, so you do not need <C>transpilePackages</C>. React 19 is required. The
          package has two entry points: <C>@hiro/niru-chat-kit</C> for the core and <C>@hiro/niru-chat-kit/mui</C> for the Material UI components.
        </P>
      </Section>
    </>
  );
}
