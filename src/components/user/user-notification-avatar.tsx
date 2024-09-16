import React from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NotificationType } from "@/enums";

interface UserNotificationAvtarProps {
  username: string;
  image: string;
  fullname: string;
  type: NotificationType;
}

const UserNotificationAvtar: React.FC<UserNotificationAvtarProps> = ({
  username,
  image,
  fullname,
  type,
}) => {
  function enumToLower(enumValue: string): string {
    return enumValue.toLowerCase();
  }

  const getIcon = (typeName: string) => {
    switch (typeName) {
      case "QUOTE":
        return Icons.quote2;
      case "REPLY":
        return Icons.reply2;
      case "REPOST":
        return Icons.repost2;
      default:
        return Icons[enumToLower(typeName) as keyof typeof Icons];
    }
  };

  const IconComponent = getIcon(type);

  return (
    <Link href={`/@${username}`}>
      <div className="ml-[1px] rounded-full outline outline-1 outline-border">
        <Avatar className="relative h-10 w-10 cursor-pointer overflow-visible ">
          <AvatarImage
            src={image}
            alt={fullname}
            className="h-full w-full rounded-full object-cover"
          />
          <AvatarFallback>{username.slice(0, 2).toUpperCase()}</AvatarFallback>
          <div
            className={cn(
              "absolute -bottom-1 -right-1 rounded-2xl border-2 border-background text-white",
              {
                "bg-[#fe0169]": type === NotificationType.LIKE,
                "bg-[#6e3def]": type === NotificationType.FOLLOW,
                "bg-[#24c3ff]": type === NotificationType.REPLY,
                "bg-[#c329bf]": type === NotificationType.REPOST,
                "bg-[#fe7900]": type === NotificationType.QUOTE,
              },
            )}
          >
            {type !== NotificationType.ADMIN && IconComponent && (
              <IconComponent className="h-[20px] w-[20px]" fill="white" />
            )}
          </div>
        </Avatar>
      </div>
    </Link>
  );
};

export default UserNotificationAvtar;
