"use client";

import Image from "next/image";
import { useState } from "react";
import "./MenuHistoryHome.css";

type FoodPhotoProps = {
  name: string;
  imageUrl?: string;
};

export default function FoodPhoto({ name, imageUrl }: FoodPhotoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <div className="mh-photo">
      {imageUrl && failedUrl !== imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${name} 사진`}
          fill
          sizes="(max-width: 600px) 80px, 144px"
          unoptimized
          className="mh-food-image"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div className="mh-photo-placeholder" aria-label={`${name} 사진 없음`}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="15" rx="4" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="8.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="m5 18 4.5-4.5 3 3 3.5-5 3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>사진 준비 중</span>
        </div>
      )}
    </div>
  );
}
