"use client";

import { useEffect, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatUnits } from "viem";
import { base } from "viem/chains";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const SubmitContent = () => {
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();

  const [appName, setAppName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approveCooldown, setApproveCooldown] = useState(false);

  // Registry contract info (for address)
  const { data: registryInfo } = useDeployedContractInfo({ contractName: "CLAWDRegistry" });
  const registryAddress = registryInfo?.address;

  // Read burn amount
  const { data: burnAmount } = useScaffoldReadContract({
    contractName: "CLAWDRegistry",
    functionName: "burnAmount",
  });

  // Read CLAWD balance
  const { data: clawdBalance, refetch: refetchBalance } = useScaffoldReadContract({
    contractName: "CLAWD",
    functionName: "balanceOf",
    args: [connectedAddress],
    query: { enabled: !!connectedAddress },
  });

  // Read CLAWD allowance
  const { data: clawdAllowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "CLAWD",
    functionName: "allowance",
    args: [connectedAddress, registryAddress],
    query: { enabled: !!connectedAddress && !!registryAddress },
  });

  // Write hooks
  const { writeContractAsync: writeRegistryAsync, isMining: isSubmitting } = useScaffoldWriteContract({
    contractName: "CLAWDRegistry",
  });

  const { writeContractAsync: writeClawdAsync } = useScaffoldWriteContract({
    contractName: "CLAWD",
  });

  const handleApprove = async () => {
    if (approvalSubmitting || approveCooldown) return;
    setApprovalSubmitting(true);
    try {
      await writeClawdAsync({ functionName: "approve", args: [registryAddress, burnAmount] });
      setApproveCooldown(true);
      setTimeout(() => {
        setApproveCooldown(false);
        refetchAllowance();
      }, 4000);
    } catch {
      notification.error("Approval failed");
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await writeRegistryAsync({ functionName: "submit", args: [appName, description, url, githubUrl] });
      notification.success("App submitted successfully!");
      setAppName("");
      setDescription("");
      setUrl("");
      setGithubUrl("");
      refetchBalance();
      refetchAllowance();
    } catch {
      notification.error("Submission failed");
    }
  };

  const isWrongNetwork = !!connectedAddress && chainId !== base.id;
  const hasEnoughAllowance = burnAmount !== undefined && clawdAllowance !== undefined && clawdAllowance >= burnAmount;

  const burnAmountFormatted = burnAmount !== undefined ? formatUnits(burnAmount, 18) : "...";
  const balanceFormatted = clawdBalance !== undefined ? formatUnits(clawdBalance, 18) : "...";

  // Determine which button to show
  const renderActionButton = () => {
    if (!connectedAddress) {
      return (
        <button type="button" className="btn btn-primary w-full" onClick={() => openConnectModal?.()}>
          Connect Wallet
        </button>
      );
    }

    if (isWrongNetwork) {
      return (
        <button type="button" className="btn btn-warning w-full" onClick={() => switchChain({ chainId: base.id })}>
          Switch to Base
        </button>
      );
    }

    if (!hasEnoughAllowance) {
      return (
        <button
          type="button"
          className="btn btn-secondary w-full"
          onClick={handleApprove}
          disabled={approvalSubmitting || approveCooldown || !burnAmount || !registryAddress}
        >
          {approvalSubmitting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : approveCooldown ? (
            "Confirming approval..."
          ) : (
            `Approve CLAWD`
          )}
        </button>
      );
    }

    return (
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={isSubmitting || !appName || !description || !url}
      >
        {isSubmitting ? (
          <span className="loading loading-spinner loading-sm"></span>
        ) : (
          `Submit App (Burns ${burnAmountFormatted} CLAWD)`
        )}
      </button>
    );
  };

  return (
    <div className="flex items-center flex-col grow pt-10 pb-16 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Submit Your App</h1>
        <p className="text-base-content/60 mb-8">
          Enter your app in the CLAWD App Competition. A burn of {burnAmountFormatted} CLAWD is required.
        </p>

        {/* Info cards */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="card bg-base-100 shadow-sm flex-1 min-w-[200px]">
            <div className="card-body py-4 px-5">
              <div className="text-sm text-base-content/60">Burn Requirement</div>
              <div className="font-bold text-lg">{burnAmountFormatted} CLAWD</div>
            </div>
          </div>
          {connectedAddress && (
            <div className="card bg-base-100 shadow-sm flex-1 min-w-[200px]">
              <div className="card-body py-4 px-5">
                <div className="text-sm text-base-content/60">Your CLAWD Balance</div>
                <div className="font-bold text-lg">{balanceFormatted} CLAWD</div>
              </div>
            </div>
          )}
        </div>

        {/* Warning */}
        {connectedAddress && !isWrongNetwork && (
          <div className="alert alert-warning mb-6">
            <span>⚠ This will permanently burn {burnAmountFormatted} CLAWD tokens. This cannot be undone.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card bg-base-100 shadow-md">
          <div className="card-body gap-5">
            {/* App Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">App Name *</span>
              </label>
              <input
                type="text"
                placeholder="My Awesome App"
                className="input input-bordered w-full"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Description *</span>
                <span className="label-text-alt text-base-content/50">{description.length}/1000</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-32 resize-none"
                placeholder="Describe your app, what it does, and why it's awesome..."
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 1000))}
                required
                maxLength={1000}
              />
            </div>

            {/* App URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">App URL *</span>
              </label>
              <input
                type="url"
                placeholder="https://myapp.example.com"
                className="input input-bordered w-full"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </div>

            {/* GitHub URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">GitHub URL</span>
                <span className="label-text-alt text-base-content/50">optional</span>
              </label>
              <input
                type="url"
                placeholder="https://github.com/username/repo"
                className="input input-bordered w-full"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
              />
            </div>

            <div className="card-actions mt-2">{renderActionButton()}</div>
          </div>
        </form>
      </div>
    </div>
  );
};

const SubmitPage: NextPage = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center flex-col grow pt-10 pb-16 px-4">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">Submit Your App</h1>
          <p className="text-base-content/60">Enter your app in the CLAWD App Competition.</p>
        </div>
      </div>
    );
  }

  return <SubmitContent />;
};

export default SubmitPage;
