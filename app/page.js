"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  OrbitControls,
  ContactShadows,
} from "@react-three/drei";

// --- KOMPONEN 3D ---
function Avatar({ isSpeaking }) {
  const { scene } = useGLTF("/model/Superhero_Male_FullBody.gltf");

  // Referensi Tulang 3D
  const headBoneRef = useRef();
  const jawBoneRef = useRef();
  const spineBoneRef = useRef();
  const rightArmBoneRef = useRef();
  const leftArmBoneRef = useRef();

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isBone) {
        const boneName = child.name.toLowerCase();

        if (boneName.includes("head")) headBoneRef.current = child;
        if (boneName.includes("jaw")) jawBoneRef.current = child;
        if (boneName.includes("spine") && !spineBoneRef.current) {
          spineBoneRef.current = child;
        }

        // Cari tulang bahu/lengan untuk gerakan tangan
        if (
          (boneName.includes("rightarm") || boneName.includes("arm_r")) &&
          !boneName.includes("forearm") &&
          !rightArmBoneRef.current
        ) {
          rightArmBoneRef.current = child;
        }
        if (
          (boneName.includes("leftarm") || boneName.includes("arm_l")) &&
          !boneName.includes("forearm") &&
          !leftArmBoneRef.current
        ) {
          leftArmBoneRef.current = child;
        }
      }
    });
  }, [scene]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // 1. KEPALA (MUKA KE DEPAN) & NAPAS
    if (headBoneRef.current) {
      // Rotasi sangat kecil hanya agar tidak kaku seperti patung, dan fokus LURUS KE DEPAN (tidak ada nilai plus)
      headBoneRef.current.rotation.y = Math.sin(time * 0.5) * 0.02;
      headBoneRef.current.rotation.x = Math.sin(time * 1.0) * 0.01;
    }

    if (spineBoneRef.current) {
      spineBoneRef.current.rotation.z = Math.sin(time * 1.5) * 0.01;
      spineBoneRef.current.rotation.x = Math.sin(time * 1.0) * 0.01;
    }

    // 2. POSISI TANGAN DEFAULT (TURUN KE BAWAH)
    // Angka 1.3 radian akan membuat lengan merapat ke samping badan
    let targetRightArmZ = 1.3;
    let targetRightArmX = 0;
    let targetLeftArmZ = -1.3;

    // 3. LOGIKA SAAT BERBICARA
    if (isSpeaking) {
      // Rahang bergerak (mulut terbuka/tertutup)
      if (jawBoneRef.current) {
        jawBoneRef.current.rotation.x = Math.abs(Math.sin(time * 20)) * 0.15;
      }
      // Tangan kanan diangkat dan bergerak (gesture menerangkan)
      targetRightArmZ = 0.4; // Diangkat (tidak lurus ke bawah lagi)
      targetRightArmX = Math.sin(time * 8) * 0.4; // Bergerak maju-mundur/melambai
    } else {
      // Jika diam, tutup mulut perlahan
      if (jawBoneRef.current) {
        jawBoneRef.current.rotation.x +=
          (0 - jawBoneRef.current.rotation.x) * 0.2;
      }
    }

    // Terapkan perubahan posisi tangan (Transisi Halus / Lerp)
    if (rightArmBoneRef.current) {
      rightArmBoneRef.current.rotation.z +=
        (targetRightArmZ - rightArmBoneRef.current.rotation.z) * 0.1;
      rightArmBoneRef.current.rotation.x +=
        (targetRightArmX - rightArmBoneRef.current.rotation.x) * 0.1;
    }
    if (leftArmBoneRef.current) {
      leftArmBoneRef.current.rotation.z +=
        (targetLeftArmZ - leftArmBoneRef.current.rotation.z) * 0.1;
    }
  });

  return <primitive object={scene} position={[0, -2.8, 0]} scale={2} />;
}

// --- HALAMAN UTAMA ---
export default function Home() {
  const [text, setText] = useState("hello testing");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [frame2D, setFrame2D] = useState(1);

  // Efek animasi 2D (PNGTuber Lip-sync)
  useEffect(() => {
    let talkInterval;

    if (isSpeaking) {
      const talkingFrames = [2, 3, 5, 8, 9];
      talkInterval = setInterval(() => {
        const randomFrame =
          talkingFrames[Math.floor(Math.random() * talkingFrames.length)];
        setFrame2D(randomFrame);
      }, 120);
    } else {
      setFrame2D(1);
    }

    return () => clearInterval(talkInterval);
  }, [isSpeaking]);

  const handleSpeak = () => {
    if (!text || isSpeaking) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-950">
      {/* AREA AVATAR (SPLIT SCREEN) */}
      <div className="flex flex-1 w-full overflow-hidden">
        {/* BAR 1: 3D AVATAR (Kiri) */}
        <div className="relative flex-1 border-r border-slate-800 bg-slate-950">
          <div className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1 rounded-full text-white text-sm font-bold tracking-widest">
            3D MODE
          </div>
          <Canvas camera={{ position: [0, 0.6, 2.2], fov: 35 }}>
            <Suspense fallback={null}>
              <Environment preset="city" />
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1} />
              <Avatar isSpeaking={isSpeaking} />
              <ContactShadows
                opacity={0.6}
                scale={10}
                blur={1.5}
                far={10}
                resolution={256}
                color="#000000"
              />
              <OrbitControls
                enableZoom={true}
                target={[0, 0.6, 0]} // Target kamera diturunkan agar lebih pas di layar
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 2}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* BAR 2: 2D AVATAR (Kanan) */}
        <div className="relative flex-1 flex items-center justify-center bg-slate-900 overflow-hidden">
          <div className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1 rounded-full text-white text-sm font-bold tracking-widest">
            2D MODE
          </div>

          <img
            src={`/model2d/jake/jakepngtuberbig_${frame2D}.png`}
            alt="2D PNGtuber"
            className={`max-h-[70%] object-contain transition-transform duration-100 ${
              isSpeaking
                ? "scale-105 -translate-y-2"
                : "scale-100 translate-y-0"
            }`}
          />
        </div>
      </div>

      {/* AREA KONTROL BAWAH */}
      <div className="z-10 w-full p-6 flex justify-center bg-black/40 backdrop-blur-md border-t border-white/10">
        <div className="w-full max-w-2xl text-center">
          <h1 className="mb-4 text-xl font-bold text-white">
            Dual Avatar TTS (3D & 2D)
          </h1>

          <textarea
            className="w-full rounded-xl bg-slate-900 p-3 text-white border border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            onClick={handleSpeak}
            disabled={isSpeaking}
            className={`mt-4 w-full rounded-xl py-3 font-bold text-white transition-all ${
              isSpeaking
                ? "bg-slate-700 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30"
            }`}
          >
            {isSpeaking ? "Sedang Berbicara..." : "Jalankan Suara"}
          </button>
        </div>
      </div>
    </main>
  );
}
