"use client";

import { useEffect, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type AdminSubmissionRowProps = {
  id: bigint;
  onRemove: (id: bigint) => Promise<void>;
  isRemoving: boolean;
};

const AdminSubmissionRow = ({ id, onRemove, isRemoving }: AdminSubmissionRowProps) => {
  const { data: submission, isLoading } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "submissions",
    args: [id],
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={5} className="text-center">
          <span className="loading loading-spinner loading-sm"></span>
        </td>
      </tr>
    );
  }

  if (!submission) return null;

  const [subId, submitter, appName, , url, , timestamp, removed] = submission as [
    bigint,
    string,
    string,
    string,
    string,
    string,
    bigint,
    boolean,
  ];

  const date = new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <tr className={removed ? "opacity-50" : ""}>
      <td className="font-mono text-sm">#{Number(subId)}</td>
      <td>
        <div className={removed ? "line-through text-base-content/50" : ""}>
          {appName}
          {removed && (
            <span className="badge badge-error badge-sm ml-2" style={{ textDecoration: "none" }}>
              Removed
            </span>
          )}
        </div>
        <div className="text-xs text-base-content/50 mt-1">{date}</div>
      </td>
      <td>
        <Address address={submitter as `0x${string}`} />
      </td>
      <td>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary text-sm truncate max-w-[150px] block"
          >
            {url}
          </a>
        ) : (
          <span className="text-base-content/40 text-sm">—</span>
        )}
      </td>
      <td>
        <button className="btn btn-error btn-xs" onClick={() => onRemove(subId)} disabled={removed || isRemoving}>
          {isRemoving ? <span className="loading loading-spinner loading-xs"></span> : "Remove"}
        </button>
      </td>
    </tr>
  );
};

const AdminContent = () => {
  const { address: connectedAddress } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [newBurnAmountStr, setNewBurnAmountStr] = useState("");
  const [removingId, setRemovingId] = useState<bigint | null>(null);
  const [isBurnUpdating, setIsBurnUpdating] = useState(false);

  const { data: admin } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "admin",
  });

  const { data: burnAmount } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "burnAmount",
  });

  const { data: submissionCount } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "submissionCount",
  });

  const { writeContractAsync: writeRegistryAsync } = useScaffoldWriteContract({
    contractName: "CLAWDRegistry",
  });

  const isAdmin = !!connectedAddress && !!admin && connectedAddress.toLowerCase() === (admin as string).toLowerCase();

  const count = submissionCount ? Number(submissionCount) : 0;
  const ids: bigint[] = [];
  for (let i = 1; i <= count; i++) {
    ids.push(BigInt(i));
  }

  const handleSetBurnAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBurnAmountStr) return;
    setIsBurnUpdating(true);
    try {
      await writeRegistryAsync({
        functionName: "setBurnAmount",
        args: [parseUnits(newBurnAmountStr, 18)],
      });
      notification.success("Burn amount updated successfully!");
      setNewBurnAmountStr("");
    } catch {
      notification.error("Failed to update burn amount");
    } finally {
      setIsBurnUpdating(false);
    }
  };

  const handleRemove = async (id: bigint) => {
    setRemovingId(id);
    try {
      await writeRegistryAsync({ functionName: "removeSubmission", args: [id] });
      notification.success(`Submission #${id} removed`);
    } catch {
      notification.error("Failed to remove submission");
    } finally {
      setRemovingId(null);
    }
  };

  // Not connected
  if (!connectedAddress) {
    return (
      <div className="flex items-center flex-col grow pt-10 px-4">
        <div className="card bg-base-100 shadow-md max-w-md w-full">
          <div className="card-body items-center text-center py-12">
            <h2 className="card-title text-2xl mb-3">Admin Panel</h2>
            <p className="text-base-content/60 mb-6">Connect admin wallet to access the admin panel.</p>
            <button className="btn btn-primary" onClick={() => openConnectModal?.()}>
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Connected but not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center flex-col grow pt-10 px-4">
        <div className="card bg-base-100 shadow-md max-w-md w-full">
          <div className="card-body items-center text-center py-12">
            <h2 className="card-title text-2xl mb-3">Admin Panel</h2>
            <div className="alert alert-error">
              <span>Access denied. Connect the admin wallet to access this page.</span>
            </div>
            {admin && (
              <div className="mt-4 text-sm text-base-content/60">
                <p className="mb-1">Admin address:</p>
                <Address address={admin as `0x${string}`} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center flex-col grow pt-10 pb-16 px-4">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-base-content/60 mb-8">Manage the CLAWD App Competition Registry</p>

        {/* Burn Amount Section */}
        <div className="card bg-base-100 shadow-md mb-8">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">Burn Amount</h2>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-base-content/60 text-sm">Current:</span>
              <span className="font-bold text-lg">
                {burnAmount !== undefined ? formatUnits(burnAmount, 18) : "..."} CLAWD
              </span>
            </div>

            <form onSubmit={handleSetBurnAmount} className="flex flex-wrap gap-3 items-end">
              <div className="form-control flex-1 min-w-[200px]">
                <label className="label">
                  <span className="label-text font-semibold">New Burn Amount (CLAWD)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 100"
                  className="input input-bordered w-full"
                  value={newBurnAmountStr}
                  onChange={e => setNewBurnAmountStr(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isBurnUpdating || !newBurnAmountStr}>
                {isBurnUpdating ? <span className="loading loading-spinner loading-sm"></span> : "Set Burn Amount"}
              </button>
            </form>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">
              All Submissions
              <span className="badge badge-neutral ml-2">{count}</span>
            </h2>

            {count === 0 ? (
              <p className="text-base-content/60 text-center py-8">No submissions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th className="w-12">ID</th>
                      <th>App Name</th>
                      <th>Submitter</th>
                      <th>URL</th>
                      <th className="w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ids.map(id => (
                      <AdminSubmissionRow
                        key={id.toString()}
                        id={id}
                        onRemove={handleRemove}
                        isRemoving={removingId === id}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPage: NextPage = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center flex-col grow pt-10 px-4">
        <div className="w-full max-w-5xl">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-base-content/60">Manage the CLAWD App Competition Registry</p>
        </div>
      </div>
    );
  }

  return <AdminContent />;
};

export default AdminPage;
