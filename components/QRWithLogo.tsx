import React from 'react';
import QRCode from 'react-qr-code';
import Image from 'next/image';

type Props = {
    value: string;
    size?: number;          // ukuran QR (px)
    logoSrc: string;        // path logo, mis. "/logoforsil.jpeg"
    logoSize?: number;      // default 25% dari size
    fgColor?: string;
    bgColor?: string;
    className?: string;
};

export default function QRWithLogo({
    value,
    size = 128,
    logoSrc,
    logoSize,
    fgColor = '#000',
    bgColor = '#fff',
    className,
}: Props) {
    const actualLogoSize = logoSize ?? Math.round(size * 0.5);
    return (
        <div className={`relative inline-block ${className ?? ''}`} style={{ width: size, height: size }}>
            <QRCode value={value} size={size} fgColor={fgColor} bgColor={bgColor} level="H" />
            <Image
                src={logoSrc}
                alt="QR logo"
                width={actualLogoSize}
                height={actualLogoSize}
                unoptimized
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-white p-1 shadow ring-1 ring-black/10"
            />
        </div>
    );
}