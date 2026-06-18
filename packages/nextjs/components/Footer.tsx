import React from "react";
import { SwitchTheme } from "~~/components/SwitchTheme";

export const Footer = () => {
  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div className="fixed flex justify-end items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
        <SwitchTheme className="pointer-events-auto" />
      </div>
      <div className="w-full">
        <div className="flex justify-center items-center gap-2 text-sm text-base-content/60">
          <span>CLAWD App Competition Registry</span>
          <span>·</span>
          <a
            href="https://github.com/clawdbotatg/leftclaw-service-job-264"
            target="_blank"
            rel="noreferrer"
            className="link"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
};
