import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import {
  PageSection,
  PageSectionContent,
} from "~/components/PageSection";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { authClient } from "~/lib/auth-client";
import { formatUserName, getInitials } from "~/lib/utils";

type OrgMember = {
  id: string;
  role: string;
  userId: string;
  user: {
    id: string;
    email: string;
    image?: string | null;
    firstname?: string;
    lastname?: string;
    name?: string;
  };
};

const inviteSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["member", "admin"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

type OrganizationMembersSectionProps = {
  organizationId: string;
  members: OrgMember[];
  currentUserId: string;
  currentUserRole: string;
  onChanged: () => void;
};

function canManageMembers(role: string) {
  return role === "owner" || role === "admin";
}

export function OrganizationMembersSection({
  organizationId,
  members,
  currentUserId,
  currentUserRole,
  onChanged,
}: OrganizationMembersSectionProps) {
  const [isInviting, setIsInviting] = useState(false);
  const canManage = canManageMembers(currentUserRole);
  const adminCount = members.filter(
    (m) => m.role === "owner" || m.role === "admin"
  ).length;

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  const onInvite = async (values: InviteFormValues) => {
    setIsInviting(true);
    const { error } = await authClient.organization.inviteMember({
      email: values.email,
      role: values.role,
      organizationId,
    });
    setIsInviting(false);

    if (error) {
      toast.error(error.message ?? "Failed to send invitation");
      return;
    }

    form.reset({ email: "", role: "member" });
    toast.success("Invitation sent");
    onChanged();
  };

  const handleRemove = useCallback(
    async (member: OrgMember) => {
      const isLastAdmin =
        (member.role === "owner" || member.role === "admin") && adminCount <= 1;

      if (isLastAdmin) {
        toast.error("Cannot remove the last admin of the organization");
        return;
      }

      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId,
      });

      if (error) {
        toast.error(error.message ?? "Failed to remove member");
        return;
      }

      toast.success("Member removed");
      onChanged();
    },
    [adminCount, organizationId, onChanged]
  );

  const handleRoleChange = async (memberId: string, role: "member" | "admin") => {
    const { error } = await authClient.organization.updateMemberRole({
      memberId,
      role,
      organizationId,
    });

    if (error) {
      toast.error(error.message ?? "Failed to update role");
      return;
    }

    toast.success("Role updated");
    onChanged();
  };

  return (
    <PageSection title="Members">
      <PageSectionContent className="space-y-6">
        {canManage ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onInvite)}
              className="flex flex-col gap-4 max-w-lg sm:flex-row sm:items-end"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Invite by email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="colleague@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="w-full sm:w-36">
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" loading={isInviting}>
                Invite
              </Button>
            </form>
          </Form>
        ) : null}

        <ul className="divide-y rounded-md border">
          {members.map((member) => {
            const firstname =
              member.user.firstname ?? member.user.name?.split(" ")[0];
            const lastname =
              member.user.lastname ?? member.user.name?.split(" ").slice(1).join(" ");
            const displayName =
              formatUserName(firstname, lastname) || member.user.email;
            const isSelf = member.userId === currentUserId;
            const isOwner = member.role === "owner";

            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-4 px-4 py-3"
              >
                <Avatar className="size-9">
                  <AvatarImage src={member.user.image ?? undefined} alt="" />
                  <AvatarFallback>
                    {getInitials(firstname, lastname)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {displayName}
                    {isSelf ? " (you)" : ""}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {member.user.email}
                  </p>
                </div>
                {canManage && !isOwner ? (
                  <Select
                    value={member.role === "admin" ? "admin" : "member"}
                    onValueChange={(value) =>
                      void handleRoleChange(
                        member.id,
                        value as "member" | "admin"
                      )
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs font-medium capitalize text-gray-600 px-2">
                    {member.role}
                  </span>
                )}
                {canManage && !isSelf && !isOwner ? (
                  <ConfirmDialog
                    title="Remove member"
                    description={`Remove ${displayName} from this organization?`}
                    confirmText="Remove"
                    onConfirm={() => void handleRemove(member)}
                  >
                    <Button type="button" variant="outline" size="sm">
                      Remove
                    </Button>
                  </ConfirmDialog>
                ) : null}
              </li>
            );
          })}
        </ul>
      </PageSectionContent>
    </PageSection>
  );
}
