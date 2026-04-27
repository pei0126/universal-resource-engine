"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { verifyOrderAction, authenticateScannerAction } from "@/app/actions";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { ScanLine, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ScannerPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const router = useRouter();
  
  const [adminToken, setAdminToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const playBeep = () => {
    try {
      // Html5 Web Audio API beep
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("伺服器安全授權驗證中...");
    
    // 將身份驗證的指責完全交給後端 Server Action 去讀取真正的 .env
    const res = await authenticateScannerAction(adminToken);
    
    toast.dismiss(toastId);
    if (res.success) {
      setAuthenticated(true);
      toast.success("✅ 身分驗證通過：啟動相機模組");
    } else {
      toast.error(res.error);
    }
  };

  useEffect(() => {
    if (authenticated && !scanning) {
      setScanning(true);
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (scanner.isScanning) {
            scanner.pause();
            playBeep();
            
            const toastId = toast.loading("安全連線驗證訂單中...");
            const res = await verifyOrderAction(adminToken, decodedText);
            
            toast.dismiss(toastId);
            
            if (res.success) {
              toast.success("✅ 核銷成功！貨物放行", { duration: 3000 });
              setTimeout(() => {
                 router.push(`/admin/${tenantId}/rentals`);
              }, 1500);
            } else {
              toast.error(res.error || "核銷遭遇異常", { duration: 3000 });
              setTimeout(() => {
                if (scanner.getState() === 2) { // 2 = PAUSED
                  scanner.resume();
                }
              }, 2500);
            }
          }
        },
        (error) => {}
      ).catch(err => {
         toast.error("相機存取被拒或無設備：" + err.message);
      });
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
          <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">安檢授權站</h2>
          <p className="text-slate-500 text-sm mb-6">您目前嘗試進入實體核銷模式，請輸入系統登記之特權 Line ID 以放行。</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              placeholder="請輸入 LINE User ID"
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors bg-slate-50 text-slate-900"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              required
            />
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-all shadow-sm"
            >
              登入核銷系統
            </button>
          </form>
          <div className="mt-8">
            <Link href={`/admin/${tenantId}/rentals`} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 transition-colors">
               <ArrowLeft className="w-4 h-4" /> 退回後台
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <button onClick={() => router.push(`/admin/${tenantId}/rentals`)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-bold tracking-widest text-emerald-400">核銷雷達</span>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="mb-8 text-center">
           <ScanLine className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
           <p className="text-slate-400 text-sm font-medium tracking-wide">請將鏡頭直視客戶手機上的電子收據 QRCode</p>
        </div>

        <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative border-4 border-slate-800 bg-black">
          {/* html5-qrcode renderer */}
          <div id="reader" className="w-full aspect-square bg-slate-800/30"></div>
        </div>
        
        <div className="mt-12 text-xs text-slate-600 font-mono">
           [AUTH_ID]: {adminToken.substring(0, 8)}...
        </div>
      </div>
    </div>
  );
}
