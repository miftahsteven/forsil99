"use client";
import Link from 'next/link';
import LogoutButton from '../../../components/LogoutButton';
import HapusData from '../../../components/HapusData';
import UbahPassword from '../../../components/UbahPassword';


export default function Home() {
  return (
    <div className="space-y-4">
      <p>Pilih menu:</p>
      <ul className="list-disc pl-5">
        <li><Link className="text-blue-600" href="/register">Form Profil Alumni</Link></li>
        <li><Link className="text-blue-600" href="/alumni">List Alumni</Link></li>
        <li><UbahPassword linkText="Ubah Password" /></li>
        {/* <li><Link className="text-black-100" href="/home">UKM Alumni (soon)</Link></li> */}
        {/** buat link Info UKM Alumni, dan jika diklik akan muncul alert "Akan Segera Hadir" */}
        <li><a href="#" onClick={() => alert('Akan Segera Hadir')} className="text-gray-500 cursor-not-allowed">Info UKM Alumni (soon)</a></li>
        {/** membuat Link Untuk Logout */}
        {/** membuat link hapus data user memanggil api/hapusdata */}
        <li><HapusData /></li>
        <li><LogoutButton /></li>
      </ul>
    </div>
  );
}