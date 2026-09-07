import React from "react";
import Logo from "../components/Logo.jsx";

export default function WelcomeScreen({ onNewServer, onImportServer, hasServers }) {
  return (
    <div className="h-full flex items-center justify-center px-8">
      <div className="max-w-md text-center">
        {!hasServers && (
          <div className="flex justify-center mb-5">
            <Logo size={56} />
          </div>
        )}
        <h2 className="font-display text-2xl font-semibold text-stone-200 mb-2">
          {hasServers ? "Bir sunucu seç" : "İlk sunucunu kur"}
        </h2>
        <p className="text-stone-400 text-sm leading-relaxed mb-6">
          {hasServers
            ? "Soldaki listeden bir sunucu seç, ya da yeni bir tane ekle."
            : "Paper sürümünü seç, klasörü belirle — geri kalanını Pyckaxe halletsin. Ardından Hangar'dan birkaç tıkla plugin ekleyebilirsin."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onNewServer}
            className="px-5 py-2.5 rounded-lg bg-copper-500 hover:bg-copper-400 text-base-900 text-sm font-medium transition-colors"
          >
            + Yeni sunucu kur
          </button>
          <button
            onClick={onImportServer}
            className="px-5 py-2.5 rounded-lg bg-base-700 hover:bg-base-600 text-stone-200 text-sm font-medium transition-colors"
          >
            Var olanı içe aktar
          </button>
        </div>
      </div>
    </div>
  );
}
