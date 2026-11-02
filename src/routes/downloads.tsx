import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Download, FileCheck2, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { isAuthenticated, triggerRequireAuth } from '../api/client';
import { Header } from '../components/layout/Header';
import { ProfileSidebar } from '../components/layout/ProfileSidebar';

export const Route = createFileRoute('/downloads')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      triggerRequireAuth({
        message: 'Faça login na sua conta para acessar seus Arquivos baixados.',
        redirectTo: '/downloads',
      });
      throw redirect({ to: '/' });
    }
  },
  component: DownloadedFilesPage,
});

interface UnlockableAsset {
  id: string;
  nftId: string;
  nftName: string;
  collection: string;
  imageUrl: string;
  fileName: string;
  format: string;
  size: string;
  ipfsCid: string;
  tokenStandard: string;
  lastDownloadedAt: string;
}

const UNLOCKABLE_ASSETS: UnlockableAsset[] = [
  {
    id: 'asset-1',
    nftId: 'nft-1',
    nftName: 'Emerald Ape #042',
    collection: 'Kurio Genesis Club',
    imageUrl: '/assets/nfts/card-1.png',
    fileName: 'Emerald-Ape-042-Master-4K-Bundle.zip',
    format: 'PNG 4K + Certificado JSON IPFS',
    size: '48.4 MB',
    ipfsCid: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
    tokenStandard: 'ERC-721',
    lastDownloadedAt: 'Verificado na carteira',
  },
  {
    id: 'asset-2',
    nftId: 'nft-2',
    nftName: 'Sage Nomad #009',
    collection: 'Nomad Sanctuary',
    imageUrl: '/assets/nfts/card-2.png',
    fileName: 'Sage-Nomad-009-3D-Voucher.glb',
    format: 'Malha 3D GLB + Texturas PBR',
    size: '112.0 MB',
    ipfsCid: 'QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX',
    tokenStandard: 'ERC-721',
    lastDownloadedAt: 'Disponível para resgate',
  },
  {
    id: 'asset-3',
    nftId: 'nft-6',
    nftName: 'Ivory Baron #088',
    collection: 'Kurio Sovereign',
    imageUrl: '/assets/nfts/card-6.png',
    fileName: 'Ivory-Baron-088-Provenance-Certificate.json',
    format: 'Certificado de Autenticidade On-Chain',
    size: '1.8 MB',
    ipfsCid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
    tokenStandard: 'ERC-721',
    lastDownloadedAt: 'Assinado via Smart Contract',
  },
];

function DownloadedFilesPage() {
  const navigate = useNavigate();
  const [downloadedIds, setDownloadedIds] = useState<string[]>(['asset-1']);

  const handleDownloadCertificate = (asset: UnlockableAsset) => {
    const certificatePayload = {
      platform: 'Kurio NFT Marketplace',
      assetName: asset.nftName,
      collection: asset.collection,
      tokenStandard: asset.tokenStandard,
      ipfsCid: asset.ipfsCid,
      fileName: asset.fileName,
      verifiedAt: new Date().toISOString(),
      contractAddress: '0x7A4290123456789ABCDEF0123456789000019E8',
    };

    const blob = new Blob([JSON.stringify(certificatePayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${asset.nftId}-certificado-kurio.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (!downloadedIds.includes(asset.id)) {
      setDownloadedIds((prev) => [...prev, asset.id]);
    }
    toast.success(`Download iniciado: ${asset.fileName}`);
  };

  const handleDownloadHighResImage = (asset: UnlockableAsset) => {
    const link = document.createElement('a');
    link.href = asset.imageUrl;
    link.download = `${asset.nftId}-artwork.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (!downloadedIds.includes(asset.id)) {
      setDownloadedIds((prev) => [...prev, asset.id]);
    }
    toast.success(`Arte em alta resolução de ${asset.nftName} baixada!`);
  };

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-16 flex flex-col">
        <Header />

        <div className="w-full mt-7 flex flex-col lg:flex-row items-start gap-8 lg:gap-10">
          <ProfileSidebar activeSection="downloads" />

          <main className="flex-1 w-full">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-3 border-b border-[#2E1E15]">
              <div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#D1823C]" />
                  <h2 className="text-[#FAF5F0] font-bold text-sm sm:text-base">
                    Arquivos baixados e Conteúdo Desbloqueável
                  </h2>
                </div>
                <p className="text-[#9E8C7E] text-xs mt-1">
                  Baixe as artes originais em alta resolução (4K), arquivos 3D e certificados de procedência IPFS dos seus NFTs.
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1D130E] border border-[#2E1E15] text-[11px] text-[#C2B2A6]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D1823C]" />
                <span>Custódia IPFS Verificada</span>
              </div>
            </div>

            <div className="space-y-4">
              {UNLOCKABLE_ASSETS.map((asset) => {
                const isDownloaded = downloadedIds.includes(asset.id);
                return (
                  <div
                    key={asset.id}
                    className="bg-[#1D130E] border border-[#2E1E15] hover:border-[#D1823C]/40 rounded-[10px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      <img
                        src={asset.imageUrl}
                        alt={asset.nftName}
                        onClick={() => navigate({ to: '/market', search: { id: asset.nftId } })}
                        className="w-16 h-16 rounded-[8px] object-cover border border-[#3B2619] shrink-0 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-[13px] font-bold text-[#FAF5F0]">
                            {asset.nftName}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#2B1B12] text-[#D1823C] text-[10px] font-bold">
                            {asset.tokenStandard}
                          </span>
                          {isDownloaded && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                              <FileCheck2 className="w-3 h-3" />
                              <span>Baixado recentemente</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#C2B2A6] font-medium mt-1 truncate">
                          {asset.fileName} ({asset.size})
                        </p>
                        <p className="text-[10.5px] text-[#8C7A6B] mt-0.5 truncate">
                          {asset.format} • CID: <span className="font-mono">{asset.ipfsCid.slice(0, 18)}...</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#2E1E15]">
                      <button
                        type="button"
                        onClick={() => handleDownloadHighResImage(asset)}
                        className="px-3.5 py-2 rounded-[5px] bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] text-[11px] font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Arte 4K</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadCertificate(asset)}
                        className="px-3.5 py-2 rounded-[5px] border border-[#3B2619] hover:border-[#D1823C] bg-[#140D0A] text-[#FAF5F0] text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#D1823C]" />
                        <span>Certificado JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate({ to: '/market', search: { id: asset.nftId } })}
                        aria-label={`Ver página de ${asset.nftName}`}
                        className="p-2 rounded-[5px] border border-[#2E1E15] hover:border-[#D1823C] text-[#9E8C7E] hover:text-[#D1823C] transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
