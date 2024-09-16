"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Globe, Lock, Plus, User2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "@/trpc/react";
import { Icons } from "@/components/icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ResizeTextarea } from "@/components/ui/resize-textarea";
import { Privacy } from "@/enums";
import type { User } from "@/types";
import { useUser } from "@clerk/nextjs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";

type UserSetupProps = Pick;

export default function AccountSetupForm({ username }: { username: string }) {
  const { user } = useUser();
  const router = useRouter();

  const [showPrivacyPage, setShowPrivacyPage] = React.useState(false);

  const [userAccountData, setUserAccountData] = React.useState<UserSetupProps>({
    bio: "",
    link: "",
    privacy: Privacy.PUBLIC,
    username: username,
  });

  const handleFieldChange = (e: React.ChangeEvent) => {
    const { name, value } = e.target;
    setUserAccountData({
      ...userAccountData,
      [name]: value,
    });
  };

  const { mutate: accountSetup, isLoading } = api.auth.accountSetup.useMutation(
    {
      onSuccess: ({ success, username }) => {
        if (success) {
          router.push(origin ? `${origin}` : "/");
        }
        toast.success(`Welcome to threads ${username} !`);
      },
      onError: (err) => {
        toast.error("AuthCallBack: Something went wrong!");
        if (err.data?.code === "UNAUTHORIZED") {
          router.push("/login");
        }
      },
      retry: false,
    },
  );

  const FormSchema = z.object({
    url: z
      .string()
      .url()
      .refine((url) => {
        try {
          const parsedUrl = new URL(url);
          return parsedUrl.protocol === "https:";
        } catch {
          return false;
        }
      }, "Must be a valid HTTPS url")
      .or(z.literal("")),
  });

  const form = useForm<z.infer>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      url: "",
    },
  });

  function handleAccountSetup() {
    accountSetup({
      bio: JSON.stringify(userAccountData.bio!, null, 2),
      link: userAccountData.link!,
      privacy: userAccountData.privacy,
    });
  }

  function handleSecurity(data: z.infer) {
    setUserAccountData({
      ...userAccountData,
      link: data.url,
    });
    setShowPrivacyPage(true);
  }

  function getFullName(firstName: string, lastName: string) {
    if (
      !lastName ||
      lastName === undefined ||
      lastName === null ||
      lastName === ""
    ) {
      return firstName;
    }

    return `${firstName} ${lastName}`;
  }

  return (
    <div className="mx-auto flex h-[95vh] w-full max-w-lg flex-col items-center justify-center gap-6 px-6">
      {!showPrivacyPage ? (
        <Form {...form}>
          <form
            className="flex w-full flex-col gap-1.5 py-4 text-start"
            onSubmit={(...args) =>
              void form.handleSubmit(handleSecurity)(...args)
            }
          >
            <div className="flex w-full flex-col items-center justify-center gap-1">
              <h2 className="scroll-m-20 text-4xl font-bold tracking-wide">
                Profile
              </h2>
              <span className="leading-7 text-muted-foreground ">
                Customize your Threads profile
              </span>
              <Card className="my-4 w-full rounded-2xl bg-transparent p-6 px-8 sm:mt-10">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="w-full">
                      <Label htmlFor="username">Name</Label>
                      <div className=" my-1 flex h-7  w-full items-center gap-2">
                        <Lock className="h-4 w-4 text-[#4D4D4D]" />
                        <div className="w-full flex-grow select-none overflow-hidden break-words text-[15px] tracking-wide text-accent-foreground outline-none">
                          {`${getFullName(user?.firstName ?? "", user?.lastName ?? "")} ${"(" + userAccountData?.username + ")"}`}
                        </div>
                      </div>
                    </div>
                    <Avatar className="h-12 w-12 rounded-full outline outline-1 outline-border ">
                      <AvatarImage
                        src={user?.imageUrl}
                        alt={user?.username ?? ""}
                        className="object-cover"
                      />
                      <AvatarFallback>
                        <User2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <Label htmlFor="bio">Bio</Label>
                  <div className="flex gap-2 ">
                    <Plus className="mt-1 h-4 w-4 text-[#4D4D4D]" />
                    <ResizeTextarea
                      name="bio"
                      className="max-h-[100px] select-none whitespace-break-spaces"
                      maxLength={100}
                      value={userAccountData.bio!}
                      onChange={handleFieldChange}
                      placeholder="Write bio"
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="url"
                    rules={{ required: false }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link</FormLabel>
                        <FormControl>
                          <div className=" my-1 flex h-7  items-center gap-2">
                            <Plus className="h-4 w-4 text-[#4D4D4D]" />
                            <Input
                              maxLength={50}
                              type="url"
                              className="min-h-min select-none  resize-none  whitespace-break-spaces rounded-none border-0 bg-transparent p-0 text-[15px] text-accent-foreground outline-none ring-0 placeholder:text-[#777777] focus-visible:ring-0 focus-visible:ring-offset-0"
                              placeholder="Add link"
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
              <Button
                type="submit"
                className="w-full select-none rounded-xl bg-foreground text-white hover:bg-foreground dark:text-black"
              >
                Continue &rarr;
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="flex w-full flex-col items-center justify-center gap-1">
          <h2 className="scroll-m-20 text-4xl font-bold tracking-wide">
            Privacy
          </h2>
          <span className="text-center leading-7 text-muted-foreground ">
            Your privacy can be different on Threads and Instagarm.
          </span>

          <RadioGroup
            defaultValue="public"
            className="mt-6 flex w-full flex-col gap-3 sm:mt-10"
          >
            <div>
              <RadioGroupItem
                value="public"
                id="public"
                className="peer sr-only"
              />
              <Label
                htmlFor="public"
                className="flex flex-col  rounded-xl border-2 border-muted  bg-transparent px-6 py-5 text-sm font-normal text-muted-foreground peer-data-[state=checked]:border-foreground [&:has([data-state=checked])]:border-foreground"
                onClick={() =>
                  setUserAccountData({
                    ...userAccountData,
                    privacy: Privacy.PUBLIC,
                  })
                }
              >
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h1 className="text-base font-medium text-black dark:text-slate-100">
                    Public profile
                  </h1>
                  <Globe className="h-5 w-5" />
                </div>
                <span className="max-w-[350px]">
                  Anyone on or off Threads can see, share and interact with your
                  content.
                </span>
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="private"
                id="private"
                className="peer sr-only"
              />
              <Label
                htmlFor="private"
                className="flex flex-col  rounded-xl border-2 border-muted  bg-transparent px-6 py-5 text-sm font-normal text-muted-foreground peer-data-[state=checked]:border-foreground [&:has([data-state=checked])]:border-foreground"
                onClick={() =>
                  setUserAccountData({
                    ...userAccountData,
                    privacy: Privacy.PRIVATE,
                  })
                }
              >
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h1 className="text-base font-medium text-black dark:text-slate-100">
                    Private profile
                  </h1>
                  <Lock className="h-5 w-5" />
                </div>
                <span className="max-w-[350px]">
                  Only your approved followers can see, share and interact with
                  your content.
                </span>
              </Label>
            </div>
          </RadioGroup>
          <Button
            className="mt-4 w-full select-none rounded-xl bg-foreground text-white hover:bg-foreground dark:text-black"
            onClick={handleAccountSetup}
            disabled={isLoading}
          >
            {isLoading && (
              <Icons.spinner
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
            Create my profile
            <span className="sr-only">Create my profile</span>
          </Button>
        </div>
      )}
    </div>
  );
}
