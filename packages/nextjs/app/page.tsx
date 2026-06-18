"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatUnits } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type SubmissionCardProps = {
  id: bigint;
};

const SubmissionCard = ({ id }: SubmissionCardProps) => {
  const { data: submission, isLoading } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "submissions",
    args: [id],
  });

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-md p-6 animate-pulse">
        <div className="h-6 bg-base-300 rounded w-1/3 mb-3"></div>
        <div className="h-4 bg-base-300 rounded w-full mb-2"></div>
        <div className="h-4 bg-base-300 rounded w-2/3"></div>
      </div>
    );
  }

  if (!submission) return null;

  // Tuple: [id, submitter, appName, description, url, githubUrl, timestamp, removed]
  const [subId, submitter, appName, description, url, githubUrl, timestamp, removed] = submission as [
    bigint,
    string,
    string,
    string,
    string,
    string,
    bigint,
    boolean,
  ];

  if (removed) return null;

  const truncatedDescription = description.length > 200 ? description.slice(0, 200) + "..." : description;
  const date = new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="card-body">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="card-title text-lg">{appName}</h3>
            <div className="flex items-center gap-2 text-sm text-base-content/60 mt-1">
              <span>#{Number(subId)}</span>
              <span>·</span>
              <span>{date}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline btn-primary">
                View App
              </a>
            )}
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline">
                GitHub
              </a>
            )}
          </div>
        </div>

        <p className="text-base-content/80 mt-2">{truncatedDescription}</p>

        <div className="flex items-center gap-2 mt-3 text-sm text-base-content/60">
          <span>Submitted by:</span>
          <Address address={submitter as `0x${string}`} />
        </div>
      </div>
    </div>
  );
};

const HomeContent = () => {
  const { data: submissionCount, isLoading: isCountLoading } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "submissionCount",
  });

  const { data: burnAmount } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "burnAmount",
  });

  const count = submissionCount ? Number(submissionCount) : 0;
  const ids: bigint[] = [];
  for (let i = count; i >= 1; i--) {
    ids.push(BigInt(i));
  }

  return (
    <div className="flex items-center flex-col grow pt-10 pb-16 px-4">
      {/* Header */}
      <div className="w-full max-w-3xl text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">CLAWD App Competition</h1>
        <p className="text-base-content/60 text-lg">Community-submitted apps powered by the CLAWD token on Base</p>

        <div className="flex flex-wrap justify-center gap-6 mt-6 mb-8">
          {!isCountLoading && (
            <div className="stat bg-base-100 rounded-box shadow-sm px-6 py-3">
              <div className="stat-title text-sm">Total Submissions</div>
              <div className="stat-value text-2xl">{count}</div>
            </div>
          )}
          {burnAmount !== undefined && burnAmount !== null && (
            <div className="stat bg-base-100 rounded-box shadow-sm px-6 py-3">
              <div className="stat-title text-sm">Burn Requirement</div>
              <div className="stat-value text-2xl">{formatUnits(burnAmount, 18)} CLAWD</div>
            </div>
          )}
        </div>

        <Link href="/submit" className="btn btn-primary btn-lg">
          Submit Your App
        </Link>
      </div>

      {/* Submissions list */}
      <div className="w-full max-w-3xl">
        {isCountLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card bg-base-100 shadow-md p-6 animate-pulse">
                <div className="h-6 bg-base-300 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-base-300 rounded w-full mb-2"></div>
                <div className="h-4 bg-base-300 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : count === 0 ? (
          <div className="card bg-base-100 shadow-md">
            <div className="card-body items-center text-center py-16">
              <div className="text-5xl mb-4">🦎</div>
              <h2 className="card-title text-2xl">No submissions yet</h2>
              <p className="text-base-content/60 mt-2">Be the first to submit your app to the competition!</p>
              <div className="card-actions mt-6">
                <Link href="/submit" className="btn btn-primary">
                  Submit Your App
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {ids.map(id => (
              <SubmissionCard key={id.toString()} id={id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Home: NextPage = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center flex-col grow pt-10 pb-16 px-4">
        <div className="w-full max-w-3xl text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">CLAWD App Competition</h1>
          <p className="text-base-content/60 text-lg">Community-submitted apps powered by the CLAWD token on Base</p>
        </div>
      </div>
    );
  }

  return <HomeContent />;
};

export default Home;
