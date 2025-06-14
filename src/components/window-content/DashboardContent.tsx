"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import {ChevronLeft, RefreshCw} from "lucide-react"
import EquipSelectWindow from "./equip/EquipSelectWindow"
import { useContractRead, useContractWrite, useContractReads } from "@/hooks/useContract"
import { observer } from "mobx-react-lite"
import { useStores } from "@stores/context"
import { useToast } from "@/hooks/use-toast"
import { Win98Loading } from "@/components/ui/win98-loading";
import { parseGotchipusInfo, TokenInfo } from "@/lib/types";
import { motion } from "framer-motion";
import { DashboardTab, EquipTab, StatsTab, WalletTab } from "./Dashboard";


const DashboardContent = observer(() => {
  const [pusName, setPusName] = useState("")
  const [oldName, setOldName] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState("")
  const [selectedEquipSlot, setSelectedEquipSlot] = useState<number | null>(null)
  const [showEquipSelect, setShowEquipSelect] = useState(false)
  const [dna, setDna] = useState("")
  const [growth, setGrowth] = useState("")
  const [activeWalletTab, setActiveWalletTab] = useState<"tokens" | "nfts">("tokens")
  const [balances, setBalances] = useState<number>(0)
  const [ids, setIds] = useState<string[]>([])
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"dashboard" | "equip" | "stats" | "wallet">("dashboard")
  const [tokenInfoMap, setTokenInfoMap] = useState<Record<string, TokenInfo>>({})
  const [tbaAddress, setTbaAddress] = useState("")
  const [queryIds, setQueryIds] = useState<string[]>([])
  const [accValidIds, setAccValidIds] = useState<string[]>([])
  const [oneCheckInfo, setOneCheckInfo] = useState<boolean>(false)
  const { walletStore } = useStores()
  const { toast } = useToast()

  const balance = useContractRead("balanceOf", [walletStore.address]);
  const allIds = useContractRead("allTokensOfOwner", [walletStore.address], { enabled: !!balance });
  const tokenBoundAccount = useContractRead("account", [selectedTokenId || 0], { enabled: !!selectedTokenId });

  const tokenInfos = useContractReads(
    "ownedTokenInfo",
    queryIds.map(id => [walletStore.address, id]),
    { enabled: queryIds.length > 0 && !oneCheckInfo }
  );
  
  useEffect(() => {
    if (balance !== undefined) {
      setBalances(balance as number);
    }
  }, [balance]);

  useEffect(() => {
    if (allIds) {
      const fetchedIds = allIds as string[];
      setIds(fetchedIds);
      setQueryIds(fetchedIds);

      setAccValidIds([]);
      setOneCheckInfo(false);
      setIsLoading(false);
    }
  }, [allIds]);

  useEffect(() => {
    if (!oneCheckInfo && tokenInfos) {

      const failedIds: string[] = [];
      const updatedAcc: string[] = [...accValidIds];
      const newTokenInfoMap: Record<string, TokenInfo> = {};

      for (let idx = 0; idx < tokenInfos.length; idx++) {
        const raw = tokenInfos[idx];
        const thisId = queryIds[idx];

        if (!raw || raw.result === undefined) {
          failedIds.push(thisId);
          continue;
        }

        let parsed;
        try {
          parsed = parseGotchipusInfo(raw);
        } catch (err) {
          failedIds.push(thisId);
          continue;
        }

        if (!parsed) {
          failedIds.push(thisId);
          continue;
        }

        if (parsed.status === 1) {
          if (!updatedAcc.includes(thisId)) {
            updatedAcc.push(thisId);
            newTokenInfoMap[thisId] = parsed;
          }
        }
      }

      setAccValidIds(updatedAcc);
      setTokenInfoMap(newTokenInfoMap);

      if (failedIds.length > 0) {
        setQueryIds(failedIds);
        return;
      }

      setIds(updatedAcc);
      setOneCheckInfo(true);
    }
  }, [tokenInfos, queryIds, oneCheckInfo, accValidIds]);

  useEffect(() => {
    if (tokenBoundAccount !== undefined) {
      setTbaAddress(tokenBoundAccount as string);
    }
  }, [tokenBoundAccount]);

  const tokenGrowth = useContractRead("growth", [selectedTokenId || 0]);
  const tokenName = useContractRead("getTokenName", [selectedTokenId || 0]);

  useEffect(() => {
    if (tokenGrowth !== undefined) {
      setGrowth(tokenGrowth as string);
    }
  }, [tokenGrowth]);

  useEffect(() => {
    if (tokenName !== undefined) {
      setPusName(tokenName as string);
    }
  }, [tokenName]);

  const {contractWrite, isConfirmed, isConfirming, isPending, error, receipt} = useContractWrite();

  const handlePet = () => {
    if (!selectedTokenId) return;
    contractWrite("pet", [selectedTokenId]);
    toast({
      title: "Submited Transaction",
      description: "Transaction submitted successfully",
    })
  }

  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: "Transaction Confirmed",
        description: "Transaction confirmed successfully",
      })
    }
  }, [isConfirmed]);


  const handleRename = () => {
    if (!selectedTokenId) return;
    
    if (newName.trim()) {
      setOldName(pusName)
      setPusName(newName.trim())
      contractWrite("setName", [newName.trim(), selectedTokenId]);
      toast({
        title: "Submited Transaction",
        description: "Transaction submitted successfully",
      })
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setIsRenaming(false);
      toast({
        title: "Transaction Confirmed",
        description: "Transaction confirmed successfully",
      })
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (error && isRenaming) {
      setIsRenaming(false);
      setPusName(oldName)
      toast({
        title: "Transaction Cancelled",
        description: "Transaction was cancelled or failed",
        variant: "destructive"
      });
    }
  }, [error, isRenaming]);

  const handleEquipSlotClick = (index: number) => {
    setSelectedEquipSlot(index === selectedEquipSlot ? null : index)
    setShowEquipSelect(true)
  };

  const handleEquipSelect = (equipment: { name: string; icon: string }) => {
    console.log("Selected equipment:", equipment)
    setShowEquipSelect(false)
  };
  
  const handleEquipSelectClose = () => {
    setShowEquipSelect(false);
    setSelectedEquipSlot(null);
  };

  const handleTokenSelect = (tokenId: string) => {
    setSelectedTokenId(tokenId);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const floatAnimation = {
    y: [0, -3, 0],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-[#d4d0c8] h-full flex items-center justify-center">
        <div className="text-center">
          <Win98Loading />
          <p className="mt-4 text-sm">Loading Gotchipus...</p>
        </div>
      </div>
    );
  }

  if (balances === 0) {
    return (
      <div className="p-6 bg-[#d4d0c8] h-full flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <Image src="/gotchi/preview.png" alt="No NFTs" width={120} height={120} />
          </div>
          <h3 className="text-xl font-bold mb-2">No NFTs Found</h3>
          <p className="text-[#000080] mb-4">You don't have any Gotchipus NFTs yet.</p>
          <button
            className="border-2 border-[#808080] shadow-win98-outer bg-[#d4d0c8] rounded-sm px-6 py-2 hover:bg-[#c0c0c0]"
          >
            Mint a Gotchipus
          </button>
        </div>
      </div>
    );
  }

  // NFT selection view
  if (!selectedTokenId) {
    return (
      <div className="p-6 bg-[#c0c0c0] h-full overflow-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {ids.map((id) => (
            <div
              key={id}
              className="bg-[#d4d0c8] flex flex-col items-center justify-center cursor-pointer border-2 border-[#808080] shadow-win98-inner rounded-sm p-3 hover:bg-[#c0c0c0]"
              onClick={() => handleTokenSelect(id.toString())}
            >
              <motion.div
                className="w-48 h-48 relative flex items-center justify-center"
                animate={floatAnimation}
              >
                <Image src={`https://app.gotchipus.com/metadata/gotchipus/${id}.png`} alt={`Gotchipus ${id}`} width={150} height={150} />
              </motion.div>
            
              <div className="text-center mt-4 font-bold">#{id.toString()}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Detailed view for selected NFT
  return (
    <div className="p-6 bg-[#c0c0c0] h-full overflow-auto">
      {/* Header with navigation */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => setSelectedTokenId(null)}
            className="border-2 border-[#808080] shadow-win98-outer bg-[#d4d0c8] rounded-sm px-3 py-1 hover:bg-[#c0c0c0] flex items-center mr-2"
          >
            <ChevronLeft size={16} className="mr-1" /> Back
          </button>
          <h2 className="text-xl font-bold">Gotchipus #{selectedTokenId}</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            className="border-2 border-[#808080] shadow-win98-outer bg-[#d4d0c8] rounded-sm px-3 py-1 hover:bg-[#c0c0c0] flex items-center"
          >
            <RefreshCw size={16} className="mr-1" /> Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab("dashboard")}
          className={`px-4 py-2 border-2 border-[#808080] shadow-win98-outer rounded-sm font-medium hover:bg-[#c0c0c0] flex items-center ${
            activeTab === "dashboard" ? "bg-[#c0c0c0]" : "bg-[#d4d0c8]"
          }`}
        >
          <Image src="/icons/dashboard.png" alt="Dashboard" width={18} height={18} className="mr-2" />
          Dashboard
        </button>
        <button 
          onClick={() => setActiveTab("equip")}
          className={`px-4 py-2 border-2 border-[#808080] shadow-win98-outer rounded-sm font-medium hover:bg-[#c0c0c0] flex items-center ${
            activeTab === "equip" ? "bg-[#c0c0c0]" : "bg-[#d4d0c8]"
          }`}
        >
          <Image src="/icons/equip.png" alt="Equip" width={18} height={18} className="mr-2" /> 
          Equip
        </button>
        <button 
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2 border-2 border-[#808080] shadow-win98-outer rounded-sm font-medium hover:bg-[#c0c0c0] flex items-center ${
            activeTab === "stats" ? "bg-[#c0c0c0]" : "bg-[#d4d0c8]"
          }`}
        >
          <Image src="/icons/stats.png" alt="Stats" width={18} height={18} className="mr-2" />
          Stats
        </button>
        <button 
          onClick={() => setActiveTab("wallet")}
          className={`px-4 py-2 border-2 border-[#808080] shadow-win98-outer rounded-sm font-medium hover:bg-[#c0c0c0] flex items-center ${
            activeTab === "wallet" ? "bg-[#c0c0c0]" : "bg-[#d4d0c8]"
          }`}
        >
          <Image src="/icons/wallet.png" alt="Wallet" width={18} height={18} className="mr-2" />
          Wallet
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <DashboardTab 
          selectedTokenId={selectedTokenId}
          pusName={pusName}
          isRenaming={isRenaming}
          newName={newName}
          setNewName={setNewName}
          setIsRenaming={setIsRenaming}
          handleRename={handleRename}
          handlePet={handlePet}
          tokenInfoMap={tokenInfoMap}
          floatAnimation={floatAnimation}
        />
      )}

      {/* Equip Tab */}
      {activeTab === "equip" && (
        <EquipTab 
          selectedEquipSlot={selectedEquipSlot}
          handleEquipSlotClick={handleEquipSlotClick}
        />
      )}

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <StatsTab 
          selectedTokenId={selectedTokenId}
          tokenInfoMap={tokenInfoMap}
          tbaAddress={tbaAddress}
        />
      )}

      {/* Wallet Tab */}
      {activeTab === "wallet" && (
        <WalletTab 
          activeWalletTab={activeWalletTab}
          setActiveWalletTab={setActiveWalletTab}
          ids={ids}
          selectedTokenId={selectedTokenId}
          handleTokenSelect={handleTokenSelect}
          tbaAddress={tbaAddress}
        />
      )}

      {showEquipSelect && (
        <EquipSelectWindow
          onClose={handleEquipSelectClose}
          onSelect={handleEquipSelect}
        />
      )}
    </div>
  )
});

export default DashboardContent;