import Image from "next/image";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        width: "100%",
      }}
    >
      <Image
        src="/why-are-you-gae.png"
        alt="Loading"
        width={160}
        height={160}
        priority
      />
    </div>
  );
}


