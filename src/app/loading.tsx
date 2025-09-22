import Image from "next/image";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <Image
        src="/why-are-you-gae.png"
        alt="Loading"
        width={200}
        height={200}
        priority
      />
    </div>
  );
}


