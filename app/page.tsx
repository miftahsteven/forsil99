import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-4">      
      <p>Pilih menu:</p>
      <ul className="list-disc pl-5">
        <li><Link className="text-blue-600" href="/register">Profil Alumni</Link></li>
        <li><Link className="text-blue-600" href="/alumni">Daftar Alumni Terdaftar</Link></li>
        <li><Link className="text-blue-600" href="/login">Daftar UKM Alumni</Link></li>
      </ul>
    </div>
  );
}