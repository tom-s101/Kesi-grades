import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Pull only the icons actually used out of lucide-react instead of
    // walking its barrel file, which otherwise lands a few hundred
    // modules in every page's bundle.
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],

    // Keep a page's rendered output for half a minute after navigating
    // away. Going Students -> a student -> back then redraws from
    // memory instead of asking the server to rebuild the whole list.
    // Short enough that another teacher's edit can't sit unseen for
    // long, long enough that stepping into a student and back doesn't
    // rebuild the whole list. Server Actions clear this cache outright
    // via revalidatePath, so your own edits are never stale.
    staleTimes: {
      dynamic: 15,
      static: 180,
    },
  },

  // The logo is the only image; these formats cut it to a fraction of
  // the JPEG on any browser from the last few years.
  images: {
    formats: ["image/avif", "image/webp"],
  },

  poweredByHeader: false,
};

export default nextConfig;
