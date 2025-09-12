import AlumniForm from '../../../components/AlumniForm';

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600">
        <a href="/home" className="text-blue-600 hover:underline">Home</a> / Register Alumni
      </div>
      <AlumniForm />
    </div>
  );
}