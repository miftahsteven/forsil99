import AlumniList from '../../../components/AlumniList';

export const dynamic = 'force-dynamic'; // pastikan tidak di-cache (opsional)

export default function AlumniPage() {
  return (
    <div className="space-y-6">
      {/* <h2 className="text-xl font-semibold">Daftar Alumni Terdaftar</h2> */}
      {/** tambahkan breadcum untuk halaman ini. Home / Daftar List Alumni */}
      <div className="text-sm text-gray-600">
        <a href="/home" className="text-blue-600 hover:underline">Home</a> / Daftar List Alumni
      </div>
      {/** tampilkan list alumni */}
      <AlumniList />
    </div>
  );
}